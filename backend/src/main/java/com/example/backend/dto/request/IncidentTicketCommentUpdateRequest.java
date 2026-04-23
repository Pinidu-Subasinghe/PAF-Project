package com.example.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record IncidentTicketCommentUpdateRequest(
        @NotBlank(message = "Comment is required")
        @Size(max = 2000, message = "Comment must be at most 2000 characters")
        String body
) {
}