package com.example.backend.exception;

public class IncidentTicketNotFoundException extends RuntimeException {
    public IncidentTicketNotFoundException(String message) {
        super(message);
    }
}