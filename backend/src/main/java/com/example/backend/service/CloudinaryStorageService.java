package com.example.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.example.backend.config.CloudinaryProperties;
import com.example.backend.dto.response.CloudinaryUploadResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryStorageService {

    private static final String DEFAULT_ROOT = "unipilot";

    private final Cloudinary cloudinary;
    private final CloudinaryProperties properties;

    public CloudinaryStorageService(Cloudinary cloudinary, CloudinaryProperties properties) {
        this.cloudinary = cloudinary;
        this.properties = properties;
    }

    public CloudinaryUploadResponse uploadResourceImage(Long resourceId, MultipartFile file) {
        String folder = buildFolder("resources", "r", resourceId);
        return uploadImage(folder, file);
    }

    public CloudinaryUploadResponse uploadTicketImage(Long ticketId, MultipartFile file) {
        String folder = buildFolder("tickets", "t", ticketId);
        return uploadImage(folder, file);
    }

    private CloudinaryUploadResponse uploadImage(String folder, MultipartFile file) {
        validateConfigured();
        validateFile(file);

        Map<String, Object> options = ObjectUtils.asMap(
                "folder", folder,
                "resource_type", "image",
                "unique_filename", true
        );

        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), options);
            String url = asString(result.get("secure_url"));
            String publicId = asString(result.get("public_id"));
            return new CloudinaryUploadResponse(url, publicId, folder);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to upload image", ex);
        }
    }

    private void validateConfigured() {
        if (isBlank(properties.getCloudName())
                || isBlank(properties.getApiKey())
                || isBlank(properties.getApiSecret())) {
            throw new IllegalStateException("Cloudinary is not configured");
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
    }

    private String buildFolder(String category, String prefix, Long id) {
        if (id == null || id < 1) {
            throw new IllegalArgumentException("Id must be a positive number");
        }

        String root = normalizeRoot(properties.getFolderRoot());
        return root + "/" + category + "/" + prefix + id;
    }

    private String normalizeRoot(String root) {
        String resolved = isBlank(root) ? DEFAULT_ROOT : root.trim();

        if (resolved.startsWith("/")) {
            resolved = resolved.substring(1);
        }
        if (resolved.endsWith("/")) {
            resolved = resolved.substring(0, resolved.length() - 1);
        }

        return resolved.isEmpty() ? DEFAULT_ROOT : resolved;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }
}
