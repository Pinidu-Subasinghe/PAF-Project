package com.example.backend.controller;

import com.example.backend.dto.request.BookingCreateRequest;
import com.example.backend.dto.request.BookingRejectRequest;
import com.example.backend.dto.request.BookingUpdateRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.enums.BookingStatus;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingCreateRequest request,
            Authentication authentication
    ) {
        BookingResponse response = bookingService.createBooking(requireEmail(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> getMyBookings(Authentication authentication) {
        return ResponseEntity.ok(bookingService.getMyBookings(requireEmail(authentication)));
    }

    @GetMapping
    public ResponseEntity<List<BookingResponse>> getAllBookings(
            @RequestParam(required = false) BookingStatus status
    ) {
        return ResponseEntity.ok(bookingService.getAllBookings(status));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<BookingResponse> approveBooking(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(bookingService.approveBooking(id, requireEmail(authentication)));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<BookingResponse> rejectBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingRejectRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(bookingService.rejectBooking(id, request, requireEmail(authentication)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookingResponse> updateBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingUpdateRequest request,
            Authentication authentication
    ) {
        BookingResponse response = bookingService.updateBooking(id, requireEmail(authentication), request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(@PathVariable Long id, Authentication authentication) {
        bookingService.deleteBooking(id, requireEmail(authentication));
        return ResponseEntity.noContent().build();
    }

    private String requireEmail(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new UserNotFoundException("User not authenticated");
        }

        return authentication.getName();
    }
}
