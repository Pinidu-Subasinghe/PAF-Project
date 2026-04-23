package com.example.backend.entity;

import com.example.backend.enums.IncidentTicketCategory;
import com.example.backend.enums.IncidentTicketPriority;
import com.example.backend.enums.IncidentTicketStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "incident_tickets")
public class IncidentTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resource_id")
    private Long resourceId;

    @Column(length = 150)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentTicketCategory category;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentTicketPriority priority;

    @Column(name = "preferred_contact_name", length = 120)
    private String preferredContactName;

    @Column(name = "preferred_contact_email", length = 150)
    private String preferredContactEmail;

    @Column(name = "preferred_contact_phone", length = 50)
    private String preferredContactPhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private IncidentTicketStatus status = IncidentTicketStatus.OPEN;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "assigned_to_user_id")
    private Long assignedToUserId;

    @Column(name = "rejection_reason", length = 1000)
    private String rejectionReason;

    @Column(name = "resolution_notes", length = 2000)
    private String resolutionNotes;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<IncidentTicketAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<IncidentTicketComment> comments = new ArrayList<>();

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;

        if (status == null) {
            status = IncidentTicketStatus.OPEN;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getResourceId() {
        return resourceId;
    }

    public void setResourceId(Long resourceId) {
        this.resourceId = resourceId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public IncidentTicketCategory getCategory() {
        return category;
    }

    public void setCategory(IncidentTicketCategory category) {
        this.category = category;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public IncidentTicketPriority getPriority() {
        return priority;
    }

    public void setPriority(IncidentTicketPriority priority) {
        this.priority = priority;
    }

    public String getPreferredContactName() {
        return preferredContactName;
    }

    public void setPreferredContactName(String preferredContactName) {
        this.preferredContactName = preferredContactName;
    }

    public String getPreferredContactEmail() {
        return preferredContactEmail;
    }

    public void setPreferredContactEmail(String preferredContactEmail) {
        this.preferredContactEmail = preferredContactEmail;
    }

    public String getPreferredContactPhone() {
        return preferredContactPhone;
    }

    public void setPreferredContactPhone(String preferredContactPhone) {
        this.preferredContactPhone = preferredContactPhone;
    }

    public IncidentTicketStatus getStatus() {
        return status;
    }

    public void setStatus(IncidentTicketStatus status) {
        this.status = status;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getAssignedToUserId() {
        return assignedToUserId;
    }

    public void setAssignedToUserId(Long assignedToUserId) {
        this.assignedToUserId = assignedToUserId;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }

    public String getResolutionNotes() {
        return resolutionNotes;
    }

    public void setResolutionNotes(String resolutionNotes) {
        this.resolutionNotes = resolutionNotes;
    }

    public List<IncidentTicketAttachment> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<IncidentTicketAttachment> attachments) {
        this.attachments.clear();
        if (attachments != null) {
            attachments.forEach(this::addAttachment);
        }
    }

    public void addAttachment(IncidentTicketAttachment attachment) {
        if (attachment == null) return;
        this.attachments.add(attachment);
        attachment.setTicket(this);
    }

    public List<IncidentTicketComment> getComments() {
        return comments;
    }

    public void setComments(List<IncidentTicketComment> comments) {
        this.comments.clear();
        if (comments != null) {
            comments.forEach(this::addComment);
        }
    }

    public void addComment(IncidentTicketComment comment) {
        if (comment == null) return;
        this.comments.add(comment);
        comment.setTicket(this);
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}