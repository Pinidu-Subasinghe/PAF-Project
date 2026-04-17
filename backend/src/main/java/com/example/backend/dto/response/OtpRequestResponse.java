package com.example.backend.dto.response;

import java.time.Instant;

public record OtpRequestResponse(
        String email,
        Instant otpExpiresAt,
        String message
) {
}
