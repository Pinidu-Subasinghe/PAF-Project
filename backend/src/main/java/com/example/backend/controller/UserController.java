package com.example.backend.controller;

import com.example.backend.dto.request.UpdateProfileRequest;
import com.example.backend.dto.response.LoginResponse;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.service.UserProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserProfileService userProfileService;

    public UserController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @PutMapping("/me")
    public ResponseEntity<LoginResponse> updateProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            Authentication authentication
    ) {
        LoginResponse response = userProfileService.updateProfile(requireEmail(authentication), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteProfile(Authentication authentication) {
        userProfileService.deleteProfile(requireEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    private String requireEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UserNotFoundException("User not authenticated");
        }
        return authentication.getName();
    }
}
