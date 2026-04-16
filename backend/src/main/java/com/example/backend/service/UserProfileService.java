package com.example.backend.service;

import com.example.backend.dto.request.UpdateProfileRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.exception.EmailAlreadyExistsException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.jwt.JwtService;
import com.example.backend.security.jwt.JwtToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final JwtService jwtService;

    public UserProfileService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse updateProfile(String email, UpdateProfileRequest request) {
        AppUser user = findByEmail(email);

        String normalizedEmail = normalizeEmail(request.getEmail());
        if (!normalizedEmail.equals(user.getEmail())
                && userRepository.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
            throw new EmailAlreadyExistsException("An account with this email already exists");
        }

        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);

        AppUser savedUser = userRepository.save(user);
        JwtToken token = jwtService.generateToken(savedUser);

        return new LoginResponse(
                token.token(),
                "Bearer",
                token.expiresAt(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getRole().name()
        );
    }

    @Transactional
    public void deleteProfile(String email) {
        AppUser user = findByEmail(email);
        userRepository.delete(user);
    }

    private AppUser findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
