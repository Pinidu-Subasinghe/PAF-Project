package com.example.backend.dto.response;

import java.util.List;

public record NotificationListResponse(
        List<NotificationResponse> notifications,
        int total
) {
}
