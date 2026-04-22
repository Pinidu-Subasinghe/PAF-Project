package com.example.backend.exception;

public class BookingConflictException extends RuntimeException {

    private final String field;

    public BookingConflictException(String message, String field) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
