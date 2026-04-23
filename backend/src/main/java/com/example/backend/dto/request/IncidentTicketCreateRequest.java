package com.example.backend.dto.request;

import com.example.backend.enums.IncidentTicketCategory;
import com.example.backend.enums.IncidentTicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record IncidentTicketCreateRequest(
        Long resourceId,

        @Size(max = 150, message = "Location must be at most 150 characters")
        String location,

        @NotNull(message = "Ticket category is required")
        IncidentTicketCategory category,

        @NotBlank(message = "Title is required")
        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @NotBlank(message = "Description is required")
        @Size(max = 2000, message = "Description must be at most 2000 characters")
        String description,

        @NotNull(message = "Priority is required")
        IncidentTicketPriority priority,

        @Size(max = 120, message = "Preferred contact name must be at most 120 characters")
        String preferredContactName,

        @Size(max = 150, message = "Preferred contact email must be at most 150 characters")
        String preferredContactEmail,

        @Size(max = 50, message = "Preferred contact phone must be at most 50 characters")
        String preferredContactPhone
) {
}