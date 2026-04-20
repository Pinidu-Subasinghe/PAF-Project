package com.example.backend.dto.request;

import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.ResourceType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalTime;
public record ResourceUpsertRequest(
        @NotBlank(message = "Resource name is required")
        @Size(max = 120, message = "Resource name must be at most 120 characters")
        String name,

        @NotNull(message = "Resource type is required")
        ResourceType type,

        @NotNull(message = "Capacity is required")
        @Min(value = 1, message = "Capacity must be at least 1")
        @Max(value = 5000, message = "Capacity must be less than or equal to 5000")
        Integer capacity,

        @NotBlank(message = "Location is required")
        @Size(max = 150, message = "Location must be at most 150 characters")
        String location,

        @NotNull(message = "Available from time is required")
        LocalTime availableFrom,

        @NotNull(message = "Available to time is required")
        LocalTime availableTo,

        @NotNull(message = "Resource status is required")
        ResourceStatus status,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        EquipmentMetadataRequest equipment
) {
}
