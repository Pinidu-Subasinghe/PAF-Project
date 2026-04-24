package com.example.backend.dto.response;

public record NotificationPreferencesResponse(
        boolean profileNotificationsEnabled,
        boolean bookingNotificationsEnabled,
        boolean ticketNotificationsEnabled
) {
}
