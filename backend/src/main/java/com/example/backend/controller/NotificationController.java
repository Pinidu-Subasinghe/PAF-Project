package com.example.backend.controller;

import com.example.backend.dto.response.NotificationResponse;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/me")
    public ResponseEntity<com.example.backend.dto.response.NotificationListResponse> getMyNotifications(Authentication authentication) {
        String email = requireEmail(authentication);
        List<NotificationResponse> list = notificationService.listUnreadByUserEmail(email);
        int total = notificationService.countNotificationsByUserEmail(email);
        return ResponseEntity.ok(new com.example.backend.dto.response.NotificationListResponse(list, total));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long notificationId,
            Authentication authentication
    ) {
        NotificationResponse response = notificationService.markAsRead(notificationId, requireEmail(authentication));
        return ResponseEntity.ok(response);
    }

    private String requireEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UserNotFoundException("User not authenticated");
        }
        return authentication.getName();
    }
}
