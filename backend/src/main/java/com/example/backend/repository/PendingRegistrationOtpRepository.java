package com.example.backend.repository;

import com.example.backend.entity.PendingRegistrationOtp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PendingRegistrationOtpRepository extends JpaRepository<PendingRegistrationOtp, Long> {

    Optional<PendingRegistrationOtp> findByEmail(String email);

    void deleteByEmail(String email);
}
