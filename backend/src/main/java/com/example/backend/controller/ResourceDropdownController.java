package com.example.backend.controller;

import com.example.backend.entity.Resource;
import com.example.backend.repository.ResourceRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/resources")
public class ResourceDropdownController {

    private final ResourceRepository resourceRepository;

    public ResourceDropdownController(ResourceRepository resourceRepository) {
        this.resourceRepository = resourceRepository;
    }

    @GetMapping
    public List<ResourceDropdownResponse> listResourcesForDropdown() {
        List<Resource> resources = resourceRepository.findAll();
        return resources.stream()
                .map(resource -> new ResourceDropdownResponse(
                        resource.getId(),
                        resource.getName(),
                        resource.getType().name()
                ))
                .collect(Collectors.toList());
    }

    // Simple DTO for dropdown data - prevents infinite recursion
    public record ResourceDropdownResponse(
            Long id,
            String name,
            String type
    ) {
    }
}
