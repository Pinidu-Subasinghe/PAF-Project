package com.example.backend.dto.response;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String actionTarget,
        boolean read,
        Instant createdAt,
        Instant readAt
) {
}
