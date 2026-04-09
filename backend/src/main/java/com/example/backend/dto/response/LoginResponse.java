package com.example.backend.dto.response;

import java.time.Instant;

public record LoginResponse(
        String token,
        String tokenType,
        Instant expiresAt,
        String email,
        String fullName,
        String role
) {
}
