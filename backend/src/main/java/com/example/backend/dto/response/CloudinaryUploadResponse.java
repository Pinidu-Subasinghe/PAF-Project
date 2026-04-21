package com.example.backend.dto.response;

public record CloudinaryUploadResponse(
        String url,
        String publicId,
        String folder
) {
}
