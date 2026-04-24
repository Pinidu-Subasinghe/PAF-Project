package com.example.backend.service;

import com.example.backend.dto.request.IncidentTicketAssignRequest;
import com.example.backend.dto.request.IncidentTicketCommentRequest;
import com.example.backend.dto.request.IncidentTicketCommentUpdateRequest;
import com.example.backend.dto.request.IncidentTicketCreateRequest;
import com.example.backend.dto.request.IncidentTicketRejectRequest;
import com.example.backend.dto.request.IncidentTicketResolveRequest;
import com.example.backend.dto.response.IncidentTicketAttachmentResponse;
import com.example.backend.dto.response.IncidentTicketCommentResponse;
import com.example.backend.dto.response.IncidentTicketResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.IncidentTicket;
import com.example.backend.entity.IncidentTicketAttachment;
import com.example.backend.entity.IncidentTicketComment;
import com.example.backend.entity.Resource;
import com.example.backend.enums.IncidentTicketCategory;
import com.example.backend.enums.IncidentTicketStatus;
import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.Role;
import com.example.backend.exception.IncidentTicketCommentNotFoundException;
import com.example.backend.exception.IncidentTicketNotFoundException;
import com.example.backend.exception.IncidentTicketValidationException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.IncidentTicketAttachmentRepository;
import com.example.backend.repository.IncidentTicketCommentRepository;
import com.example.backend.repository.IncidentTicketRepository;
import com.example.backend.repository.ResourceRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class IncidentTicketService {

    private static final int MAX_ATTACHMENTS = 3;

    private final IncidentTicketRepository ticketRepository;
    private final IncidentTicketAttachmentRepository attachmentRepository;
    private final IncidentTicketCommentRepository commentRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    public IncidentTicketService(
            IncidentTicketRepository ticketRepository,
            IncidentTicketAttachmentRepository attachmentRepository,
            IncidentTicketCommentRepository commentRepository,
            UserRepository userRepository,
            ResourceRepository resourceRepository,
            CloudinaryStorageService cloudinaryStorageService
    ) {
        this.ticketRepository = ticketRepository;
        this.attachmentRepository = attachmentRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
        this.cloudinaryStorageService = cloudinaryStorageService;
    }

    @Transactional
    public IncidentTicketResponse createTicket(
            String actorEmail,
            IncidentTicketCreateRequest request,
            List<MultipartFile> attachments
    ) {
        AppUser actor = findUserByEmail(actorEmail);
        validateCreateRequest(request, attachments);

        Resource resource = request.resourceId() == null ? null : findResource(request.resourceId());

        IncidentTicket ticket = new IncidentTicket();
        ticket.setUserId(actor.getId());
        ticket.setResourceId(resource != null ? resource.getId() : null);
        ticket.setLocation(resolveLocation(request, resource));
        ticket.setCategory(request.category());
        ticket.setTitle(request.title().trim());
        ticket.setDescription(request.description().trim());
        ticket.setPriority(request.priority());
        ticket.setPreferredContactName(trimToNull(request.preferredContactName()));
        ticket.setPreferredContactEmail(trimToNull(request.preferredContactEmail()));
        ticket.setPreferredContactPhone(trimToNull(request.preferredContactPhone()));

        IncidentTicket saved = ticketRepository.save(ticket);
        uploadAttachments(saved, attachments);

        return toResponse(findTicket(saved.getId()), actor);
    }

    @Transactional(readOnly = true)
    public List<IncidentTicketResponse> getMyTickets(String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(actor.getId())
                .stream()
                .map(ticket -> toResponse(ticket, actor))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IncidentTicketResponse> getAllTickets(IncidentTicketStatus status) {
        List<IncidentTicket> tickets = status == null
                ? ticketRepository.findAllByOrderByCreatedAtDesc()
                : ticketRepository.findByStatusOrderByCreatedAtDesc(status);

        return tickets.stream()
                .map(ticket -> toResponse(ticket, null))
                .toList();
    }

            @Transactional(readOnly = true)
            public List<IncidentTicketResponse> getAssignedTickets(String actorEmail, IncidentTicketStatus status) {
            AppUser actor = findUserByEmail(actorEmail);

            List<IncidentTicket> tickets = status == null
                ? ticketRepository.findByAssignedToUserIdOrderByCreatedAtDesc(actor.getId())
                : ticketRepository.findByAssignedToUserIdAndStatusOrderByCreatedAtDesc(actor.getId(), status);

            return tickets.stream()
                .map(ticket -> toResponse(ticket, actor))
                .toList();
            }

    @Transactional(readOnly = true)
    public IncidentTicketResponse getTicket(Long ticketId, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicket ticket = findTicket(ticketId);

        if (!canViewTicket(ticket, actor)) {
            throw new IncidentTicketValidationException("You are not allowed to view this ticket");
        }

        return toResponse(ticket, actor);
    }

    @Transactional
    public IncidentTicketResponse assignTechnician(Long ticketId, IncidentTicketAssignRequest request, String actorEmail) {
        IncidentTicket ticket = findTicket(ticketId);
        ensureStatus(ticket, IncidentTicketStatus.OPEN, "assign");

        AppUser technician = findUserById(request.technicianId());
        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IncidentTicketValidationException("Assigned user must have TECHNICIAN role");
        }

        ticket.setAssignedToUserId(technician.getId());
        ticket.setStatus(IncidentTicketStatus.IN_PROGRESS);
        ticket.setRejectionReason(null);

        if (ticket.getCategory() == IncidentTicketCategory.RESOURCE && ticket.getResourceId() != null) {
            Resource resource = findResource(ticket.getResourceId());
            resource.setStatus(ResourceStatus.OUT_OF_SERVICE);
            resourceRepository.save(resource);
        }

        IncidentTicket saved = ticketRepository.save(ticket);

        return toResponse(saved, findUserByEmail(actorEmail));
    }

    @Transactional
    public IncidentTicketResponse rejectTicket(Long ticketId, IncidentTicketRejectRequest request, String actorEmail) {
        IncidentTicket ticket = findTicket(ticketId);
        ensureStatus(ticket, IncidentTicketStatus.OPEN, "reject");

        ticket.setStatus(IncidentTicketStatus.REJECTED);
        ticket.setRejectionReason(request.reason().trim());
        ticket.setAssignedToUserId(null);

        if (ticket.getCategory() == IncidentTicketCategory.RESOURCE && ticket.getResourceId() != null) {
            Resource resource = findResource(ticket.getResourceId());
            resource.setStatus(ResourceStatus.ACTIVE);
            resourceRepository.save(resource);
        }

        IncidentTicket saved = ticketRepository.save(ticket);

        return toResponse(saved, findUserByEmail(actorEmail));
    }

    @Transactional
    public IncidentTicketResponse resolveTicket(Long ticketId, IncidentTicketResolveRequest request, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicket ticket = findTicket(ticketId);

        if (!canResolve(ticket, actor)) {
            throw new IncidentTicketValidationException("You are not allowed to resolve this ticket");
        }

        ticket.setStatus(IncidentTicketStatus.RESOLVED);
        ticket.setResolutionNotes(request.resolutionNotes().trim());

        if (ticket.getCategory() == IncidentTicketCategory.RESOURCE && ticket.getResourceId() != null) {
            Resource resource = findResource(ticket.getResourceId());
            resource.setStatus(ResourceStatus.ACTIVE);
            resourceRepository.save(resource);
        }

        IncidentTicket saved = ticketRepository.save(ticket);

        return toResponse(saved, actor);
    }

    @Transactional
    public IncidentTicketResponse closeTicket(Long ticketId, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicket ticket = findTicket(ticketId);

        if (!ticket.getUserId().equals(actor.getId())) {
            throw new IncidentTicketValidationException("Only the ticket owner can close this ticket");
        }

        if (ticket.getStatus() != IncidentTicketStatus.OPEN) {
            throw new IncidentTicketValidationException("You can only close a ticket while it is still open");
        }

        ticket.setStatus(IncidentTicketStatus.CLOSED);
        ticket.setClosedAt(Instant.now());

        if (ticket.getCategory() == IncidentTicketCategory.RESOURCE && ticket.getResourceId() != null) {
            Resource resource = findResource(ticket.getResourceId());
            resource.setStatus(ResourceStatus.ACTIVE);
            resourceRepository.save(resource);
        }

        IncidentTicket saved = ticketRepository.save(ticket);
        return toResponse(saved, actor);
    }

    @Transactional
    public void deleteTicket(Long ticketId, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicket ticket = findTicket(ticketId);

        if (actor.getRole() != Role.USER) {
            throw new IncidentTicketValidationException("Only normal users can permanently delete tickets");
        }

        if (!ticket.getUserId().equals(actor.getId())) {
            throw new IncidentTicketValidationException("Only the ticket owner can delete this ticket");
        }

        IncidentTicketStatus status = ticket.getStatus();
        boolean canDelete = status == IncidentTicketStatus.OPEN
                || status == IncidentTicketStatus.RESOLVED
                || status == IncidentTicketStatus.REJECTED
                || status == IncidentTicketStatus.CLOSED;

        if (!canDelete) {
            throw new IncidentTicketValidationException("Ticket cannot be deleted while it is in progress");
        }

        ticket.getAttachments().forEach(attachment -> cloudinaryStorageService.deleteByPublicId(attachment.getPublicId()));
        ticketRepository.delete(ticket);
    }

    @Transactional
    public IncidentTicketCommentResponse addComment(Long ticketId, IncidentTicketCommentRequest request, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicket ticket = findTicket(ticketId);

        ensureCanComment(ticket, actor);

        IncidentTicketComment comment = new IncidentTicketComment();
        comment.setTicketId(ticket.getId());
        comment.setAuthorUserId(actor.getId());
        comment.setAuthorName(resolveAuthorName(actor));
        comment.setBody(request.body().trim());

        return toCommentResponse(commentRepository.save(comment), actor);
    }

    @Transactional
    public IncidentTicketCommentResponse updateComment(Long commentId, IncidentTicketCommentUpdateRequest request, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicketComment comment = findComment(commentId);

        if (!canEditOrDeleteComment(comment, actor)) {
            throw new IncidentTicketValidationException("You can only edit your own comments");
        }

        comment.setBody(request.body().trim());
        return toCommentResponse(commentRepository.save(comment), actor);
    }

    @Transactional
    public void deleteComment(Long commentId, String actorEmail) {
        AppUser actor = findUserByEmail(actorEmail);
        IncidentTicketComment comment = findComment(commentId);

        if (!canEditOrDeleteComment(comment, actor)) {
            throw new IncidentTicketValidationException("You can only delete your own comments");
        }

        commentRepository.delete(comment);
    }

    private void uploadAttachments(IncidentTicket ticket, List<MultipartFile> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }

        List<MultipartFile> filtered = attachments.stream()
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (filtered.size() > MAX_ATTACHMENTS) {
            throw new IncidentTicketValidationException("A ticket can include at most 3 image attachments");
        }

        for (MultipartFile file : filtered) {
            var upload = cloudinaryStorageService.uploadTicketImage(ticket.getId(), file);
            IncidentTicketAttachment attachment = new IncidentTicketAttachment();
            attachment.setTicket(ticket);
            attachment.setUrl(upload.url());
            attachment.setPublicId(upload.publicId());
            attachment.setFolder(upload.folder());
            ticket.addAttachment(attachment);
        }

        ticketRepository.save(ticket);
    }

    private IncidentTicketResponse toResponse(IncidentTicket ticket, AppUser actor) {
        List<IncidentTicketAttachmentResponse> attachmentResponses = ticket.getAttachments().stream()
                .sorted(Comparator.comparing(IncidentTicketAttachment::getId))
                .map(attachment -> new IncidentTicketAttachmentResponse(
                        attachment.getId(),
                        attachment.getUrl(),
                        attachment.getPublicId(),
                        attachment.getFolder()
                ))
                .toList();

        List<IncidentTicketCommentResponse> commentResponses = ticket.getComments().stream()
                .sorted(Comparator.comparing(IncidentTicketComment::getCreatedAt))
                .map(comment -> toCommentResponse(comment, actor))
                .toList();

        boolean isOwner = actor != null && ticket.getUserId().equals(actor.getId());
        boolean isAdmin = actor != null && actor.getRole() == Role.ADMIN;
        boolean isAssignee = actor != null && ticket.getAssignedToUserId() != null && ticket.getAssignedToUserId().equals(actor.getId());

        return new IncidentTicketResponse(
                ticket.getId(),
                ticket.getResourceId(),
                ticket.getLocation(),
                ticket.getCategory() != null ? ticket.getCategory().name() : null,
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getPriority() != null ? ticket.getPriority().name() : null,
                ticket.getStatus() != null ? ticket.getStatus().name() : null,
                ticket.getUserId(),
                ticket.getAssignedToUserId(),
                ticket.getPreferredContactName(),
                ticket.getPreferredContactEmail(),
                ticket.getPreferredContactPhone(),
                ticket.getRejectionReason(),
                ticket.getResolutionNotes(),
                attachmentResponses,
                commentResponses,
                ticket.getClosedAt(),
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                isOwner && ticket.getStatus() == IncidentTicketStatus.OPEN,
                isAdmin && ticket.getStatus() == IncidentTicketStatus.OPEN,
                isAdmin && ticket.getStatus() == IncidentTicketStatus.OPEN,
                isAssignee && ticket.getStatus() == IncidentTicketStatus.IN_PROGRESS
        );
    }

    private IncidentTicketCommentResponse toCommentResponse(IncidentTicketComment comment, AppUser actor) {
        boolean editable = actor != null && canEditOrDeleteComment(comment, actor);
        return new IncidentTicketCommentResponse(
                comment.getId(),
                comment.getTicketId(),
                comment.getAuthorUserId(),
                comment.getAuthorName(),
                comment.getBody(),
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                editable,
                editable
        );
    }

    private IncidentTicket findTicket(Long ticketId) {
        return ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IncidentTicketNotFoundException("Incident ticket not found"));
    }

    private IncidentTicketComment findComment(Long commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new IncidentTicketCommentNotFoundException("Incident ticket comment not found"));
    }

    private AppUser findUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private AppUser findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private Resource findResource(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    private void validateCreateRequest(IncidentTicketCreateRequest request, List<MultipartFile> attachments) {
        if (request == null) {
            throw new IllegalArgumentException("Request payload is required");
        }

        if (request.resourceId() == null && isBlank(request.location())) {
            throw new IncidentTicketValidationException("Either resource ID or location is required");
        }

        if (attachments != null && attachments.stream().filter(file -> file != null && !file.isEmpty()).count() > MAX_ATTACHMENTS) {
            throw new IncidentTicketValidationException("A ticket can include at most 3 image attachments");
        }
    }

    private String resolveLocation(IncidentTicketCreateRequest request, Resource resource) {
        if (!isBlank(request.location())) {
            return request.location().trim();
        }

        return resource != null ? resource.getLocation() : null;
    }

    private void ensureStatus(IncidentTicket ticket, IncidentTicketStatus expected, String action) {
        if (ticket.getStatus() != expected) {
            throw new IncidentTicketValidationException("Ticket must be " + expected.name().toLowerCase(Locale.ROOT) + " to " + action);
        }
    }

    private boolean canResolve(IncidentTicket ticket, AppUser actor) {
        return actor.getRole() == Role.TECHNICIAN
                && ticket.getStatus() == IncidentTicketStatus.IN_PROGRESS
                && ticket.getAssignedToUserId() != null
                && ticket.getAssignedToUserId().equals(actor.getId());
    }

    private boolean canViewTicket(IncidentTicket ticket, AppUser actor) {
        return actor.getRole() == Role.ADMIN
                || ticket.getUserId().equals(actor.getId())
                || (ticket.getAssignedToUserId() != null && ticket.getAssignedToUserId().equals(actor.getId()));
    }

    private void ensureCanComment(IncidentTicket ticket, AppUser actor) {
        boolean isOwner = ticket.getUserId().equals(actor.getId());
        boolean isAssignee = ticket.getAssignedToUserId() != null && ticket.getAssignedToUserId().equals(actor.getId());
        boolean isAdmin = actor.getRole() == Role.ADMIN;

        if (!(isOwner || isAssignee || isAdmin)) {
            throw new IncidentTicketValidationException("You are not allowed to comment on this ticket");
        }
    }

    private boolean canEditOrDeleteComment(IncidentTicketComment comment, AppUser actor) {
        return actor.getRole() == Role.ADMIN || comment.getAuthorUserId().equals(actor.getId());
    }

    private String resolveAuthorName(AppUser actor) {
        return actor.getFullName() != null && !actor.getFullName().trim().isEmpty()
                ? actor.getFullName().trim()
                : actor.getEmail();
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}