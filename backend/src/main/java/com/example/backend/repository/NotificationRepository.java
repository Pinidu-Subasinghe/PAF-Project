package com.example.backend.repository;

import com.example.backend.entity.Notification;
import com.example.backend.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    Optional<Notification> findByIdAndUserId(Long id, Long userId);

    boolean existsByUserIdAndTypeAndIsReadFalse(Long userId, NotificationType type);

    List<Notification> findByUserIdAndTypeAndIsReadFalse(Long userId, NotificationType type);

    long deleteByUserId(Long userId);
}
