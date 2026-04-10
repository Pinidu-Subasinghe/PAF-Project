package com.example.backend.security.jwt;

import java.time.Instant;

public record JwtToken(
        String token,
        Instant expiresAt
) {
}
