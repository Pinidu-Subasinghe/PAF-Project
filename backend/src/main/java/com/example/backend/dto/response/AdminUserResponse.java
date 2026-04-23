package com.example.backend.dto.response;

import com.example.backend.enums.Role;
import java.time.Instant;

public record AdminUserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        Instant createdAt,
        Instant updatedAt
) {
}
