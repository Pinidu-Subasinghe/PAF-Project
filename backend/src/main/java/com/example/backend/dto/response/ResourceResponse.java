package com.example.backend.dto.response;

import java.time.Instant;
import java.time.LocalTime;

public record ResourceResponse(
        Long id,
        String name,
        String type,
        Integer capacity,
        String location,
        LocalTime availableFrom,
        LocalTime availableTo,
        String status,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
}
