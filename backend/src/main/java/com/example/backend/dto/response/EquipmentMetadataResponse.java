package com.example.backend.dto.response;

import java.time.LocalDate;

public record EquipmentMetadataResponse(
        Long id,
        String category,
        String brand,
        String model,
        String serialNumber,
        LocalDate purchaseDate,
        String notes
) {
}
