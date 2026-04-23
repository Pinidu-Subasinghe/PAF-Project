package com.example.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record IncidentTicketAssignRequest(
        @NotNull(message = "Technician ID is required")
        @Positive(message = "Technician ID must be greater than 0")
        Long technicianId
) {
}