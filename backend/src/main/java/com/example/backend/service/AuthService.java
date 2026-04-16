package com.example.backend.service;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.dto.response.RegisterResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.enums.Role;
import com.example.backend.exception.EmailAlreadyExistsException;
import com.example.backend.exception.InvalidCredentialsException;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.jwt.JwtService;
import com.example.backend.security.jwt.JwtToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with this email already exists");
        }

        AppUser user = new AppUser();
        user.setFullName(request.getFullName().trim());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);

        AppUser savedUser = userRepository.save(user);

        return new RegisterResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        AppUser user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (isPasswordSetupRequired(user)) {
            throw new InvalidCredentialsException("Password is not set. Sign in with Google and create a password in profile.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        JwtToken token = jwtService.generateToken(user);

        return new LoginResponse(
                token.token(),
                "Bearer",
                token.expiresAt(),
                user.getEmail(),
                user.getFullName(),
            user.getRole().name(),
            isPasswordSetupRequired(user)
        );
    }

    @Transactional
    public AppUser findOrCreateOAuthUser(String email, String fullName) {
        String normalizedEmail = normalizeEmail(email);

        return userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> {
                    AppUser user = new AppUser();
                    user.setEmail(normalizedEmail);
                    user.setFullName(resolveDisplayName(fullName, normalizedEmail));
                    user.setPasswordHash("");
                    user.setRole(Role.USER);
                    return userRepository.save(user);
                });
    }

    private boolean isPasswordSetupRequired(AppUser user) {
        return user.getPasswordHash() == null || user.getPasswordHash().isBlank();
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveDisplayName(String fullName, String normalizedEmail) {
        if (fullName != null && !fullName.trim().isBlank()) {
            String trimmedName = fullName.trim();
            return trimmedName.length() > 120 ? trimmedName.substring(0, 120) : trimmedName;
        }

        String localPart = normalizedEmail.contains("@")
                ? normalizedEmail.substring(0, normalizedEmail.indexOf('@'))
                : normalizedEmail;
        return localPart.length() > 120 ? localPart.substring(0, 120) : localPart;
    }
}
