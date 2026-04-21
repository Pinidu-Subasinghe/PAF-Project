package com.example.backend.controller;

import com.example.backend.dto.request.ResourceUpsertRequest;
import com.example.backend.dto.response.ResourceResponse;
import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.ResourceType;
import com.example.backend.enums.EquipmentCategory;
import com.example.backend.service.ResourceService;
import org.springframework.security.core.Authentication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resources")
public class ResourceController {

    private final ResourceService resourceService;
    private static final Logger log = LoggerFactory.getLogger(ResourceController.class);

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @GetMapping
    public ResponseEntity<List<ResourceResponse>> listResources(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ResourceStatus status,
            @RequestParam(required = false) EquipmentCategory equipmentCategory
    ) {
        return ResponseEntity.ok(resourceService.listResources(type, minCapacity, location, status, equipmentCategory));
    }

    @GetMapping("/{resourceId}")
    public ResponseEntity<ResourceResponse> getResource(@PathVariable Long resourceId) {
        return ResponseEntity.ok(resourceService.getResource(resourceId));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> createResource(
            @Valid @RequestPart("data") ResourceUpsertRequest request,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            Authentication authentication
    ) {
        ResourceResponse saved = resourceService.createResource(request, coverImage, images);

        // Notification creation for resource additions removed; replaced by frontend toast notification.

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping(value = "/{resourceId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ResourceResponse> updateResource(
            @PathVariable Long resourceId,
            @Valid @RequestPart("data") ResourceUpsertRequest request,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @RequestParam(value = "keepImagePublicIds", required = false) List<String> keepImagePublicIds
    ) {
        return ResponseEntity.ok(resourceService.updateResource(resourceId, request, coverImage, images, keepImagePublicIds));
    }

    @DeleteMapping("/{resourceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteResource(@PathVariable Long resourceId) {
        resourceService.deleteResource(resourceId);
        return ResponseEntity.noContent().build();
    }
}
