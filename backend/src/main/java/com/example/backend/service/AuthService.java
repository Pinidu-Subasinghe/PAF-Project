package com.example.backend.service;

import com.example.backend.dto.request.LoginRequest;
import com.example.backend.dto.request.RegisterRequest;
import com.example.backend.dto.request.VerifyRegistrationOtpRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.dto.response.OtpRequestResponse;
import com.example.backend.dto.response.RegisterResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.PendingRegistrationOtp;
import com.example.backend.enums.Role;
import com.example.backend.exception.EmailAlreadyExistsException;
import com.example.backend.exception.InvalidCredentialsException;
import com.example.backend.exception.InvalidOtpException;
import com.example.backend.repository.PendingRegistrationOtpRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.jwt.JwtService;
import com.example.backend.security.jwt.JwtToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

@Service
public class AuthService {

    private static final int REGISTRATION_OTP_EXPIRATION_MINUTES = 5;
    private static final int OTP_RANGE = 1_000_000;

    private final UserRepository userRepository;
    private final PendingRegistrationOtpRepository pendingRegistrationOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RegistrationOtpMailService registrationOtpMailService;
    private final SecureRandom secureRandom;

    public AuthService(
            UserRepository userRepository,
            PendingRegistrationOtpRepository pendingRegistrationOtpRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            RegistrationOtpMailService registrationOtpMailService
    ) {
        this.userRepository = userRepository;
        this.pendingRegistrationOtpRepository = pendingRegistrationOtpRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.registrationOtpMailService = registrationOtpMailService;
        this.secureRandom = new SecureRandom();
    }

    @Transactional
    public OtpRequestResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("An account with this email already exists");
        }

        String trimmedFullName = request.getFullName().trim();
        String otp = generateSixDigitOtp();
        Instant expiresAt = Instant.now().plus(REGISTRATION_OTP_EXPIRATION_MINUTES, ChronoUnit.MINUTES);

        PendingRegistrationOtp pendingRegistrationOtp = pendingRegistrationOtpRepository.findByEmail(normalizedEmail)
                .orElseGet(PendingRegistrationOtp::new);

        pendingRegistrationOtp.setFullName(trimmedFullName);
        pendingRegistrationOtp.setEmail(normalizedEmail);
        pendingRegistrationOtp.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        pendingRegistrationOtp.setOtpHash(passwordEncoder.encode(otp));
        pendingRegistrationOtp.setOtpExpiresAt(expiresAt);

        pendingRegistrationOtpRepository.save(pendingRegistrationOtp);
        registrationOtpMailService.sendRegistrationOtpEmail(normalizedEmail, trimmedFullName, otp, expiresAt);

        return new OtpRequestResponse(
                normalizedEmail,
                expiresAt,
                "Verification OTP sent to your email"
        );
    }

    @Transactional
    public RegisterResponse verifyRegistrationOtp(VerifyRegistrationOtpRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());

        if (userRepository.existsByEmail(normalizedEmail)) {
            pendingRegistrationOtpRepository.deleteByEmail(normalizedEmail);
            throw new EmailAlreadyExistsException("An account with this email already exists");
        }

        PendingRegistrationOtp pendingRegistrationOtp = pendingRegistrationOtpRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidOtpException("No OTP request found for this email. Please request a new OTP."));

        if (pendingRegistrationOtp.getOtpExpiresAt() == null || pendingRegistrationOtp.getOtpExpiresAt().isBefore(Instant.now())) {
            pendingRegistrationOtpRepository.delete(pendingRegistrationOtp);
            throw new InvalidOtpException("OTP has expired. Please request a new OTP.");
        }

        String otpHash = pendingRegistrationOtp.getOtpHash();
        if (otpHash == null || !passwordEncoder.matches(request.getOtp(), otpHash)) {
            throw new InvalidOtpException("Invalid OTP. Please check and try again.");
        }

        AppUser user = new AppUser();
        user.setFullName(pendingRegistrationOtp.getFullName());
        user.setEmail(normalizedEmail);
        user.setPasswordHash(pendingRegistrationOtp.getPasswordHash());
        user.setRole(Role.USER);

        AppUser savedUser = userRepository.save(user);
        pendingRegistrationOtpRepository.delete(pendingRegistrationOtp);

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

    private String generateSixDigitOtp() {
        return String.format(Locale.ROOT, "%06d", secureRandom.nextInt(OTP_RANGE));
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
