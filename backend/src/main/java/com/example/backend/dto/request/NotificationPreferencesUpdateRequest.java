package com.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;

public record NotificationPreferencesUpdateRequest(
        @NotNull(message = "Profile notification preference is required")
        Boolean profileNotificationsEnabled,
        @NotNull(message = "Booking notification preference is required")
        Boolean bookingNotificationsEnabled,
        @NotNull(message = "Ticket notification preference is required")
        Boolean ticketNotificationsEnabled
) {
}
