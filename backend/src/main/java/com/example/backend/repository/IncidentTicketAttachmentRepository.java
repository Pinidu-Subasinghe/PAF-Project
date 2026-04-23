package com.example.backend.repository;

import com.example.backend.entity.IncidentTicket;
import com.example.backend.entity.IncidentTicketAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentTicketAttachmentRepository extends JpaRepository<IncidentTicketAttachment, Long> {
    List<IncidentTicketAttachment> findByTicket(IncidentTicket ticket);

    long countByTicket(IncidentTicket ticket);
}