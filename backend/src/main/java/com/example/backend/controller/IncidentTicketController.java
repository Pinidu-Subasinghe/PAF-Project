package com.example.backend.controller;

import com.example.backend.dto.request.IncidentTicketAssignRequest;
import com.example.backend.dto.request.IncidentTicketCommentRequest;
import com.example.backend.dto.request.IncidentTicketCommentUpdateRequest;
import com.example.backend.dto.request.IncidentTicketCreateRequest;
import com.example.backend.dto.request.IncidentTicketRejectRequest;
import com.example.backend.dto.request.IncidentTicketResolveRequest;
import com.example.backend.dto.response.IncidentTicketCommentResponse;
import com.example.backend.dto.response.IncidentTicketResponse;
import com.example.backend.enums.IncidentTicketStatus;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.service.IncidentTicketService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
public class IncidentTicketController {

    private final IncidentTicketService ticketService;

    public IncidentTicketController(IncidentTicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<IncidentTicketResponse> createTicket(
            @Valid @RequestPart("data") IncidentTicketCreateRequest request,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments,
            Authentication authentication
    ) {
        IncidentTicketResponse response = ticketService.createTicket(requireEmail(authentication), request, attachments);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<IncidentTicketResponse>> getMyTickets(Authentication authentication) {
        return ResponseEntity.ok(ticketService.getMyTickets(requireEmail(authentication)));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<IncidentTicketResponse>> getAllTickets(
            @RequestParam(required = false) IncidentTicketStatus status
    ) {
        return ResponseEntity.ok(ticketService.getAllTickets(status));
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<List<IncidentTicketResponse>> getAssignedTickets(
            @RequestParam(required = false) IncidentTicketStatus status,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.getAssignedTickets(requireEmail(authentication), status));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<IncidentTicketResponse> getTicket(
            @PathVariable Long ticketId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.getTicket(ticketId, requireEmail(authentication)));
    }

    @PutMapping("/{ticketId}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<IncidentTicketResponse> assignTechnician(
            @PathVariable Long ticketId,
            @Valid @RequestBody IncidentTicketAssignRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.assignTechnician(ticketId, request, requireEmail(authentication)));
    }

    @PutMapping("/{ticketId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<IncidentTicketResponse> rejectTicket(
            @PathVariable Long ticketId,
            @Valid @RequestBody IncidentTicketRejectRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.rejectTicket(ticketId, request, requireEmail(authentication)));
    }

    @PutMapping("/{ticketId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'TECHNICIAN')")
    public ResponseEntity<IncidentTicketResponse> resolveTicket(
            @PathVariable Long ticketId,
            @Valid @RequestBody IncidentTicketResolveRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.resolveTicket(ticketId, request, requireEmail(authentication)));
    }

    @PutMapping("/{ticketId}/close")
    public ResponseEntity<IncidentTicketResponse> closeTicket(
            @PathVariable Long ticketId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.closeTicket(ticketId, requireEmail(authentication)));
    }

    @DeleteMapping("/{ticketId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> deleteTicket(
            @PathVariable Long ticketId,
            Authentication authentication
    ) {
        ticketService.deleteTicket(ticketId, requireEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{ticketId}/comments")
    public ResponseEntity<IncidentTicketCommentResponse> addComment(
            @PathVariable Long ticketId,
            @Valid @RequestBody IncidentTicketCommentRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.addComment(ticketId, request, requireEmail(authentication)));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<IncidentTicketCommentResponse> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody IncidentTicketCommentUpdateRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.updateComment(commentId, request, requireEmail(authentication)));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId, Authentication authentication) {
        ticketService.deleteComment(commentId, requireEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    private String requireEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UserNotFoundException("User not authenticated");
        }

        return authentication.getName();
    }
}