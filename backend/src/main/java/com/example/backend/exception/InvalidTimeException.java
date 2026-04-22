package com.example.backend.exception;

public class InvalidTimeException extends RuntimeException {

    private final String field;

    public InvalidTimeException(String message, String field) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
