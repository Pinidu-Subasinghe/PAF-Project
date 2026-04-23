package com.example.backend.dto.response;

public record IncidentTicketAttachmentResponse(
        Long id,
        String url,
        String publicId,
        String folder
) {
}