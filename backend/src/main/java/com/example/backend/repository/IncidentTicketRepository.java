package com.example.backend.repository;

import com.example.backend.entity.IncidentTicket;
import com.example.backend.enums.IncidentTicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentTicketRepository extends JpaRepository<IncidentTicket, Long> {
    List<IncidentTicket> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<IncidentTicket> findByStatusOrderByCreatedAtDesc(IncidentTicketStatus status);

    List<IncidentTicket> findAllByOrderByCreatedAtDesc();
}