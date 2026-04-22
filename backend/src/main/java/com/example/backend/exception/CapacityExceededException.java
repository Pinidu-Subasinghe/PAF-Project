package com.example.backend.exception;

public class CapacityExceededException extends RuntimeException {

    private final String field;

    public CapacityExceededException(String message, String field) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
