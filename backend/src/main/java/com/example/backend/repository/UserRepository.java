package com.example.backend.repository;

import com.example.backend.entity.AppUser;
import com.example.backend.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    boolean existsByEmail(String email);

    boolean existsByEmailAndIdNot(String email, Long id);

    Optional<AppUser> findByEmail(String email);

    java.util.List<AppUser> findByRole(Role role);
}
