package com.example.backend.repository;

import com.example.backend.entity.IncidentTicketComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IncidentTicketCommentRepository extends JpaRepository<IncidentTicketComment, Long> {
    List<IncidentTicketComment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);

    Optional<IncidentTicketComment> findByIdAndTicketId(Long id, Long ticketId);
}