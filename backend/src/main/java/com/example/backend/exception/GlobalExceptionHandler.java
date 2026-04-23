package com.example.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Optional;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<ApiError> handleEmailAlreadyExists(
            EmailAlreadyExistsException ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

        @ExceptionHandler(InvalidCredentialsException.class)
        public ResponseEntity<ApiError> handleInvalidCredentials(
                        InvalidCredentialsException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
        }

        @ExceptionHandler(InvalidOtpException.class)
        public ResponseEntity<ApiError> handleInvalidOtp(
                        InvalidOtpException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
        }

        @ExceptionHandler(OtpDeliveryException.class)
        public ResponseEntity<ApiError> handleOtpDelivery(
                        OtpDeliveryException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(), request);
        }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        FieldError fieldError = Optional.ofNullable(ex.getBindingResult().getFieldErrors())
                .flatMap(errors -> errors.stream().findFirst())
                .orElse(null);

        String message = fieldError != null ? fieldError.getDefaultMessage() : "Validation failed";
        String field = fieldError != null ? fieldError.getField() : null;

        return buildResponse(HttpStatus.BAD_REQUEST, message, field, request);
    }

    @ExceptionHandler(CapacityExceededException.class)
    public ResponseEntity<ApiError> handleCapacityExceeded(
            CapacityExceededException ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ex.getField(), request);
    }

    @ExceptionHandler(InvalidTimeException.class)
    public ResponseEntity<ApiError> handleInvalidTime(
            InvalidTimeException ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), ex.getField(), request);
    }

        @ExceptionHandler(BookingConflictException.class)
        public ResponseEntity<ApiError> handleBookingConflict(
                        BookingConflictException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.CONFLICT, ex.getMessage(), ex.getField(), request);
        }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleInvalidJson(
            HttpMessageNotReadableException ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Invalid request payload", request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
                return buildResponse(HttpStatus.BAD_REQUEST, "Invalid data for this request", request);
        }

        @ExceptionHandler(DataAccessException.class)
        public ResponseEntity<ApiError> handleDataAccess(
                        DataAccessException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.BAD_REQUEST, "Invalid data for this request", request);
        }

        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ApiError> handleConstraintViolation(
                        ConstraintViolationException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.BAD_REQUEST, "Validation failed", request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(
            IllegalArgumentException ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

        @ExceptionHandler(NotificationNotFoundException.class)
        public ResponseEntity<ApiError> handleNotificationNotFound(
                        NotificationNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(ResourceNotFoundException.class)
        public ResponseEntity<ApiError> handleResourceNotFound(
                        ResourceNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(BookingNotFoundException.class)
        public ResponseEntity<ApiError> handleBookingNotFound(
                        BookingNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(IncidentTicketNotFoundException.class)
        public ResponseEntity<ApiError> handleIncidentTicketNotFound(
                        IncidentTicketNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(IncidentTicketCommentNotFoundException.class)
        public ResponseEntity<ApiError> handleIncidentTicketCommentNotFound(
                        IncidentTicketCommentNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

        @ExceptionHandler(IncidentTicketValidationException.class)
        public ResponseEntity<ApiError> handleIncidentTicketValidation(
                        IncidentTicketValidationException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
        }

        @ExceptionHandler(UserNotFoundException.class)
        public ResponseEntity<ApiError> handleUserNotFound(
                        UserNotFoundException ex,
                        HttpServletRequest request
        ) {
                return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage(), request);
        }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnhandled(
            Exception ex,
            HttpServletRequest request
    ) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", request);
    }

    private ResponseEntity<ApiError> buildResponse(
            HttpStatus status,
            String message,
            HttpServletRequest request
    ) {
        return buildResponse(status, message, null, request);
    }

    private ResponseEntity<ApiError> buildResponse(
            HttpStatus status,
            String message,
            String field,
            HttpServletRequest request
    ) {
        ApiError error = new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                request.getRequestURI(),
                field
        );

        return ResponseEntity.status(status).body(error);
    }
}
