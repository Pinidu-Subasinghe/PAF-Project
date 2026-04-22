package com.example.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record BookingCreateRequest(
        @NotNull(message = "Resource ID is required")
        @Min(value = 1, message = "Resource ID must be greater than 0")
        Long resourceId,

        @NotNull(message = "Date is required")
        LocalDate date,

        @NotNull(message = "Start time is required")
        LocalTime startTime,

        @NotNull(message = "End time is required")
        LocalTime endTime,

        @NotBlank(message = "Purpose is required")
        @Size(max = 500, message = "Purpose must be at most 500 characters")
        String purpose,

        @NotNull(message = "Expected attendees is required")
        @Min(value = 1, message = "Expected attendees must be at least 1")
        Integer attendees
) {
}
