package com.example.backend.service;

import com.example.backend.dto.request.ResourceUpsertRequest;
import com.example.backend.dto.request.EquipmentMetadataRequest;
import com.example.backend.dto.response.ResourceResponse;
import com.example.backend.dto.response.EquipmentMetadataResponse;
import com.example.backend.entity.EquipmentMetadata;
import com.example.backend.entity.Resource;
import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.ResourceType;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ResourceRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import com.example.backend.enums.EquipmentCategory;
import jakarta.persistence.criteria.JoinType;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public ResourceService(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
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
        validateAvailabilityWindow(request);

        Resource resource = new Resource();
        apply(resource, request);
        Resource saved = resourceRepository.save(resource);
        return toResponse(saved);
    }

    @Transactional
    public ResourceResponse updateResource(Long resourceId, ResourceUpsertRequest request) {
        validateAvailabilityWindow(request);

        Resource resource = findResource(resourceId);
        apply(resource, request);
        Resource saved = resourceRepository.save(resource);
        return toResponse(saved);
    }

    @Transactional
    public void deleteResource(Long resourceId) {
        resourceRepository.delete(findResource(resourceId));
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
            resource.getCreatedAt(),
            resource.getUpdatedAt()
        );
    }
}
