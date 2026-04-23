package com.example.backend.dto.response;

import java.time.Instant;
import java.util.List;

public record IncidentTicketResponse(
        Long id,
        Long resourceId,
        String location,
        String category,
        String title,
        String description,
        String priority,
        String status,
        Long userId,
        Long assignedToUserId,
        String preferredContactName,
        String preferredContactEmail,
        String preferredContactPhone,
        String rejectionReason,
        String resolutionNotes,
        List<IncidentTicketAttachmentResponse> attachments,
        List<IncidentTicketCommentResponse> comments,
        Instant closedAt,
        Instant createdAt,
        Instant updatedAt,
        boolean canClose,
        boolean canAssign,
        boolean canReject,
        boolean canResolve
) {
}