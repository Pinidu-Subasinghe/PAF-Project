package com.example.backend.controller;

import com.example.backend.dto.response.CloudinaryUploadResponse;
import com.example.backend.service.CloudinaryStorageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {

    private final CloudinaryStorageService cloudinaryStorageService;

    public UploadController(CloudinaryStorageService cloudinaryStorageService) {
        this.cloudinaryStorageService = cloudinaryStorageService;
    }

    @PostMapping(value = "/resources/{resourceId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CloudinaryUploadResponse> uploadResourceImage(
            @PathVariable Long resourceId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(cloudinaryStorageService.uploadResourceImage(resourceId, file));
    }

    @PostMapping(value = "/tickets/{ticketId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CloudinaryUploadResponse> uploadTicketImage(
            @PathVariable Long ticketId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(cloudinaryStorageService.uploadTicketImage(ticketId, file));
    }
}
