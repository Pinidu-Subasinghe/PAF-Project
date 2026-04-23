package com.example.backend.exception;

public class IncidentTicketValidationException extends RuntimeException {
    public IncidentTicketValidationException(String message) {
        super(message);
    }
}