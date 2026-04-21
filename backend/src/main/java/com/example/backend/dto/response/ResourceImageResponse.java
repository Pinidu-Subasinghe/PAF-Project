package com.example.backend.dto.response;

public record ResourceImageResponse(
        String url,
        String publicId,
        boolean cover
) {
}
