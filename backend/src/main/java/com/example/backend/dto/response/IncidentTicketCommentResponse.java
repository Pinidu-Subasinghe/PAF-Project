package com.example.backend.dto.response;

import java.time.Instant;

public record IncidentTicketCommentResponse(
        Long id,
        Long ticketId,
        Long authorUserId,
        String authorName,
        String body,
        Instant createdAt,
        Instant updatedAt,
        boolean editable,
        boolean deletable
) {
}