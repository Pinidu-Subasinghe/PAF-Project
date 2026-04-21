package com.example.backend.repository;

import com.example.backend.entity.Resource;
import com.example.backend.entity.ResourceImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResourceImageRepository extends JpaRepository<ResourceImage, Long> {
    List<ResourceImage> findByResource(Resource resource);
    void deleteByResource(Resource resource);
}
