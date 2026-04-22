package com.example.backend.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record BookingResponse(
        Long id,
        Long resourceId,
        Long userId,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        String purpose,
        Integer attendees,
        String status,
        String rejectionReason,
        Instant createdAt
) {
}
