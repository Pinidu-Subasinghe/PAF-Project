package com.example.backend.service;

import com.example.backend.dto.request.ResourceUpsertRequest;
import com.example.backend.dto.response.ResourceResponse;
import com.example.backend.entity.Resource;
import com.example.backend.enums.ResourceStatus;
import com.example.backend.enums.ResourceType;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.ResourceRepository;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;

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
            ResourceStatus status
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
        return toResponse(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse updateResource(Long resourceId, ResourceUpsertRequest request) {
        validateAvailabilityWindow(request);

        Resource resource = findResource(resourceId);
        apply(resource, request);
        return toResponse(resourceRepository.save(resource));
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
    }

    private ResourceResponse toResponse(Resource resource) {
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
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }
}
