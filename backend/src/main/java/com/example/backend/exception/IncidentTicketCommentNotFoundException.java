package com.example.backend.exception;

public class IncidentTicketCommentNotFoundException extends RuntimeException {
    public IncidentTicketCommentNotFoundException(String message) {
        super(message);
    }
}