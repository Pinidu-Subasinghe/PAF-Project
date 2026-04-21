package com.example.backend.dto.response;

import java.time.Instant;
import java.time.LocalTime;
import java.util.List;

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
        com.example.backend.dto.response.EquipmentMetadataResponse equipment,
        List<com.example.backend.dto.response.CloudinaryUploadResponse> images,
        Instant createdAt,
        Instant updatedAt
) {
}
