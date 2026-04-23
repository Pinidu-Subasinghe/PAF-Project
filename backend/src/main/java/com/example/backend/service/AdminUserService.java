package com.example.backend.service;

import com.example.backend.dto.request.AdminCreateUserRequest;
import com.example.backend.dto.request.AdminUpdateUserRoleRequest;
import com.example.backend.dto.response.AdminUserResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.enums.Role;
import com.example.backend.exception.EmailAlreadyExistsException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.GrantedAuthority;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AdminUserResponse createUser(AdminCreateUserRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with this email already exists");
        }

        Role requestedRole = request.getRole() == null ? Role.USER : request.getRole();

        if (requestedRole == Role.TECHNICIAN) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            boolean isAdmin = auth != null && auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(a -> a.equals("ROLE_ADMIN"));
            if (!isAdmin) {
                throw new AccessDeniedException("Only ADMIN can create TECHNICIAN users");
            }
        }

        AppUser user = new AppUser();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(requestedRole);

        AppUser saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public AdminUserResponse updateUserRole(Long id, AdminUpdateUserRoleRequest request) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));

        user.setRole(request.getRole());
        AppUser saved = userRepository.save(user);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        return userRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    private AdminUserResponse toResponse(AppUser user) {
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
