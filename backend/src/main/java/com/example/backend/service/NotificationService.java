package com.example.backend.service;

import com.example.backend.dto.response.NotificationResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.Notification;
import com.example.backend.enums.NotificationType;
import com.example.backend.exception.NotificationNotFoundException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final String PASSWORD_SETUP_TITLE = "Set your account password";
    private static final String PASSWORD_SETUP_MESSAGE = "You signed up with Google. Set a password to enable email login.";
    private static final String PASSWORD_SETUP_ACTION_TARGET = "change-password";
    private static final String RESOURCE_ADDED_TITLE = "Resource added successfully";
    private static final String RESOURCE_ADDED_ACTION_TARGET = "manage-resources";

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listUnreadByUserEmail(String email) {
        AppUser user = findByEmail(email);
        return notificationRepository.findTop3ByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public int countNotificationsByUserEmail(String email) {
        AppUser user = findByEmail(email);
        return (int) notificationRepository.countByUserId(user.getId());
    }

    @Transactional
    @Scheduled(cron = "0 0 * * * *") // runs hourly
    public void cleanupOldNotifications() {
        java.time.Instant cutoff = java.time.Instant.now().minusSeconds(72 * 3600L);
        long deleted = notificationRepository.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            log.info("Deleted {} notifications older than 72 hours", deleted);
        }
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, String email) {
        AppUser user = findByEmail(email);

        Notification notification = notificationRepository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new NotificationNotFoundException("Notification not found"));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(Instant.now());
        }

        return toResponse(notification);
    }

    @Transactional
    public void ensurePasswordSetupRequiredNotification(AppUser user) {
        if (user == null || user.getId() == null) {
            return;
        }

        boolean alreadyExists = notificationRepository.existsByUserIdAndTypeAndIsReadFalse(
                user.getId(),
                NotificationType.PASSWORD_SETUP_REQUIRED
        );

        if (alreadyExists) {
            return;
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(NotificationType.PASSWORD_SETUP_REQUIRED);
        notification.setTitle(PASSWORD_SETUP_TITLE);
        notification.setMessage(PASSWORD_SETUP_MESSAGE);
        notification.setActionTarget(PASSWORD_SETUP_ACTION_TARGET);

        notificationRepository.save(notification);
    }

    @Transactional
    public void markPasswordSetupRequiredNotificationsAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdAndTypeAndIsReadFalse(
                userId,
                NotificationType.PASSWORD_SETUP_REQUIRED
        );

        Instant now = Instant.now();
        for (Notification notification : notifications) {
            notification.setRead(true);
            notification.setReadAt(now);
        }
    }

    @Transactional
    public void deleteAllByUserId(Long userId) {
        notificationRepository.deleteByUserId(userId);
    }

    @Transactional
    public void createResourceAddedNotification(String email, String resourceName) {
        AppUser user = findByEmail(email);
        if (user == null || user.getId() == null) {
            return;
        }

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType(NotificationType.RESOURCE_ADDED);
        notification.setTitle(RESOURCE_ADDED_TITLE);

        String namePart = (resourceName == null || resourceName.isBlank()) ? "" : "'" + resourceName + "' ";
        notification.setMessage("Resource " + namePart + "added successfully.");
        notification.setActionTarget(RESOURCE_ADDED_ACTION_TARGET);

        Notification saved = notificationRepository.save(notification);
        log.info("Created RESOURCE_ADDED notification (id={}) for user {} about resource {}", saved.getId(), user.getEmail(), resourceName);
    }

    private AppUser findByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        return userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType().name(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getActionTarget(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getReadAt()
        );
    }
}
