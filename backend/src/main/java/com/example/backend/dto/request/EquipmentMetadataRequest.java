package com.example.backend.dto.request;

import com.example.backend.enums.EquipmentCategory;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record EquipmentMetadataRequest(
        EquipmentCategory category,

        @Size(max = 120, message = "Brand must be at most 120 characters")
        String brand,

        @Size(max = 120, message = "Model must be at most 120 characters")
        String model,

        @Size(max = 120, message = "Serial number must be at most 120 characters")
        String serialNumber,

        LocalDate purchaseDate,

        @Size(max = 1000, message = "Notes must be at most 1000 characters")
        String notes
) {
}
