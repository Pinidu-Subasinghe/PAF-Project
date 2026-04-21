package com.example.backend.service;

import com.example.backend.dto.request.ResourceUpsertRequest;
import com.example.backend.dto.request.EquipmentMetadataRequest;
import com.example.backend.dto.response.ResourceResponse;
import com.example.backend.dto.response.EquipmentMetadataResponse;
import com.example.backend.dto.response.ResourceImageResponse;
import com.example.backend.entity.EquipmentMetadata;
import com.example.backend.entity.Resource;
import com.example.backend.entity.ResourceImage;
import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.ResourceType;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ResourceImageRepository;
import com.example.backend.repository.ResourceRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import com.example.backend.enums.EquipmentCategory;
import jakarta.persistence.criteria.JoinType;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceImageRepository resourceImageRepository;
    private final CloudinaryStorageService cloudinaryStorageService;

    public ResourceService(
            ResourceRepository resourceRepository,
            ResourceImageRepository resourceImageRepository,
            CloudinaryStorageService cloudinaryStorageService
    ) {
        this.resourceRepository = resourceRepository;
        this.resourceImageRepository = resourceImageRepository;
        this.cloudinaryStorageService = cloudinaryStorageService;
    }

    public List<ResourceResponse> listResources(
            ResourceType type,
            Integer minCapacity,
            String location,
            ResourceStatus status,
            EquipmentCategory equipmentCategory
    ) {
        Specification<Resource> specification = (root, query, criteriaBuilder) -> criteriaBuilder.conjunction();

        if (type != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("type"), type));
        }

        if (minCapacity != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.greaterThanOrEqualTo(root.get("capacity"), minCapacity));
        }

        if (location != null && !location.isBlank()) {
            String normalizedLocation = "%" + location.trim().toLowerCase() + "%";
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("location")), normalizedLocation));
        }

        if (status != null) {
            specification = specification.and((root, query, criteriaBuilder) ->
                    criteriaBuilder.equal(root.get("status"), status));
        }

        if (equipmentCategory != null) {
            specification = specification.and((root, query, criteriaBuilder) -> {
                var join = root.join("equipmentMetadata", JoinType.INNER);
                return criteriaBuilder.equal(join.get("category"), equipmentCategory);
            });
        }

        return resourceRepository.findAll(specification)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public ResourceResponse getResource(Long resourceId) {
        return toResponse(findResource(resourceId));
    }

    @Transactional
    public ResourceResponse createResource(ResourceUpsertRequest request) {
        return createResource(request, null, null);
    }

    @Transactional
    public ResourceResponse createResource(ResourceUpsertRequest request, MultipartFile coverImage, List<MultipartFile> additionalImages) {
        validateAvailabilityWindow(request);

        Resource resource = new Resource();
        apply(resource, request);
        Resource saved = resourceRepository.save(resource);

        // handle images
        int extraCount = 0;
        if (additionalImages != null) {
            for (MultipartFile f : additionalImages) {
                if (f != null && !f.isEmpty()) extraCount++;
            }
        }
        if (extraCount > 2) {
            throw new IllegalArgumentException("A maximum of 2 additional images is allowed");
        }

        if (coverImage != null && !coverImage.isEmpty()) {
            var upload = cloudinaryStorageService.uploadResourceImage(saved.getId(), coverImage);
            ResourceImage img = new ResourceImage();
            img.setPublicId(upload.publicId());
            img.setUrl(upload.url());
            img.setCover(true);
            saved.addImage(img);
        }

        if (additionalImages != null && !additionalImages.isEmpty()) {
            int added = 0;
            for (MultipartFile f : additionalImages) {
                if (f == null || f.isEmpty()) continue;
                if (added >= 2) break;
                var upload = cloudinaryStorageService.uploadResourceImage(saved.getId(), f);
                ResourceImage img = new ResourceImage();
                img.setPublicId(upload.publicId());
                img.setUrl(upload.url());
                img.setCover(false);
                saved.addImage(img);
                added++;
            }
        }

        Resource finalSaved = resourceRepository.save(saved);
        return toResponse(finalSaved);
    }


    @Transactional
    public ResourceResponse updateResource(Long resourceId, ResourceUpsertRequest request) {
        return updateResource(resourceId, request, null, null, null);
    }

    @Transactional
    public ResourceResponse updateResource(Long resourceId, ResourceUpsertRequest request, MultipartFile coverImage, List<MultipartFile> additionalImages) {
        return updateResource(resourceId, request, coverImage, additionalImages, null);
    }

    @Transactional
    public ResourceResponse updateResource(
            Long resourceId,
            ResourceUpsertRequest request,
            MultipartFile coverImage,
            List<MultipartFile> additionalImages,
            List<String> keepImagePublicIds
    ) {
        validateAvailabilityWindow(request);

        Resource resource = findResource(resourceId);
        apply(resource, request);

        Set<String> keepPublicIds = new HashSet<>();
        if (keepImagePublicIds != null) {
            for (String id : keepImagePublicIds) {
                if (id != null && !id.isBlank()) {
                    keepPublicIds.add(id.trim());
                }
            }
        }

        List<ResourceImage> oldCovers = resource.getImages().stream().filter(ResourceImage::isCover).collect(Collectors.toList());
        boolean keepExistingCover = oldCovers.stream().anyMatch(img -> keepPublicIds.contains(img.getPublicId()));

        if (coverImage != null && !coverImage.isEmpty()) {
            for (ResourceImage oi : oldCovers) {
                cloudinaryStorageService.deleteByPublicId(oi.getPublicId());
                resource.removeImage(oi);
            }

            var upload = cloudinaryStorageService.uploadResourceImage(resource.getId(), coverImage);
            ResourceImage newCover = new ResourceImage();
            newCover.setPublicId(upload.publicId());
            newCover.setUrl(upload.url());
            newCover.setCover(true);
            resource.addImage(newCover);
        } else if (!keepExistingCover) {
            for (ResourceImage oi : oldCovers) {
                cloudinaryStorageService.deleteByPublicId(oi.getPublicId());
                resource.removeImage(oi);
            }
        }

        List<ResourceImage> oldExtras = resource.getImages().stream().filter(i -> !i.isCover()).collect(Collectors.toList());
        for (ResourceImage oi : oldExtras) {
            if (!keepPublicIds.contains(oi.getPublicId())) {
                cloudinaryStorageService.deleteByPublicId(oi.getPublicId());
                resource.removeImage(oi);
            }
        }

        if (additionalImages != null) {
            int uploadCount = 0;
            for (MultipartFile f : additionalImages) {
                if (f != null && !f.isEmpty()) {
                    uploadCount++;
                }
            }

            long keptExtras = resource.getImages().stream().filter(i -> !i.isCover()).count();
            if (keptExtras + uploadCount > 2) {
                throw new IllegalArgumentException("A maximum of 2 additional images is allowed");
            }

            for (MultipartFile f : additionalImages) {
                if (f == null || f.isEmpty()) continue;
                var upload = cloudinaryStorageService.uploadResourceImage(resource.getId(), f);
                ResourceImage img = new ResourceImage();
                img.setPublicId(upload.publicId());
                img.setUrl(upload.url());
                img.setCover(false);
                resource.addImage(img);
            }
        }

        Resource saved = resourceRepository.save(resource);
        return toResponse(saved);
    }

    @Transactional
    public void deleteResource(Long resourceId) {
        Resource resource = findResource(resourceId);

        // delete images from Cloudinary
        List<ResourceImage> images = new ArrayList<>(resource.getImages());
        for (ResourceImage img : images) {
            try {
                cloudinaryStorageService.deleteByPublicId(img.getPublicId());
            } catch (Exception ignored) {
            }
        }

        resourceRepository.delete(resource);
    }

    private Resource findResource(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    private void validateAvailabilityWindow(ResourceUpsertRequest request) {
        if (!request.availableTo().isAfter(request.availableFrom())) {
            throw new IllegalArgumentException("Available to time must be after available from time");
        }
    }

    private void apply(Resource resource, ResourceUpsertRequest request) {
        resource.setName(request.name().trim());
        resource.setType(request.type());
        resource.setCapacity(request.capacity());
        resource.setLocation(request.location().trim());
        resource.setAvailableFrom(request.availableFrom());
        resource.setAvailableTo(request.availableTo());
        resource.setStatus(request.status());
        resource.setDescription(request.description() == null ? null : request.description().trim());
        applyEquipmentMetadata(resource, request);
    }

    private void applyEquipmentMetadata(Resource resource, ResourceUpsertRequest request) {
        EquipmentMetadataRequest eqReq = request.equipment();

        // If no equipment payload provided, remove any existing metadata
        if (eqReq == null) {
            if (resource.getEquipmentMetadata() != null) {
                resource.setEquipmentMetadata(null);
            }
            return;
        }

        // Only allow equipment metadata for RESOURCE_TYPE = EQUIPMENT
        if (resource.getType() != com.example.backend.enums.ResourceType.EQUIPMENT) {
            throw new IllegalArgumentException("Equipment metadata provided for non-equipment resource");
        }

        EquipmentMetadata meta = resource.getEquipmentMetadata();
        if (meta == null) {
            meta = new EquipmentMetadata();
            // link will be set in resource.setEquipmentMetadata
            resource.setEquipmentMetadata(meta);
        }

        meta.setCategory(eqReq.category());
        meta.setBrand(eqReq.brand() == null ? null : eqReq.brand().trim());
        meta.setModel(eqReq.model() == null ? null : eqReq.model().trim());
        meta.setSerialNumber(eqReq.serialNumber() == null ? null : eqReq.serialNumber().trim());
        meta.setPurchaseDate(eqReq.purchaseDate());
        meta.setNotes(eqReq.notes() == null ? null : eqReq.notes().trim());
    }

    private ResourceResponse toResponse(Resource resource) {
        EquipmentMetadata meta = resource.getEquipmentMetadata();
        EquipmentMetadataResponse metaResp = null;
        if (meta != null) {
            metaResp = new EquipmentMetadataResponse(
                meta.getId(),
                meta.getCategory() == null ? null : meta.getCategory().name(),
                meta.getBrand(),
                meta.getModel(),
                meta.getSerialNumber(),
                meta.getPurchaseDate(),
                meta.getNotes()
            );
        }

        List<ResourceImageResponse> imgs = resource.getImages().stream()
            .map(i -> new ResourceImageResponse(i.getUrl(), i.getPublicId(), i.isCover()))
            .toList();

        return new ResourceResponse(
            resource.getId(),
            resource.getName(),
            resource.getType().name(),
            resource.getCapacity(),
            resource.getLocation(),
            resource.getAvailableFrom(),
            resource.getAvailableTo(),
            resource.getStatus().name(),
            resource.getDescription(),
            metaResp,
            imgs,
            resource.getCreatedAt(),
            resource.getUpdatedAt()
        );
    }
}
