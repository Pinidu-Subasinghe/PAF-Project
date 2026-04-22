package com.example.backend.repository;

import com.example.backend.entity.Booking;
import com.example.backend.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);

    List<Booking> findAllByOrderByCreatedAtDesc();
}
