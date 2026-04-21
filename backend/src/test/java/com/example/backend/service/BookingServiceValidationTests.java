package com.example.backend.service;

import com.example.backend.dto.request.BookingCreateRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.Booking;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.ResourceRepository;
import com.example.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceValidationTests {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @InjectMocks
    private BookingService bookingService;

    private AppUser user;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(7L);
        user.setEmail("user@unipilot.test");
    }

    @Test
    void createBooking_withBlankPurpose_throwsIllegalArgument() {
        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "   ",
                5
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Purpose is required", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withAttendeesZero_throwsIllegalArgument() {
        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                0
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Expected attendees must be at least 1", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withEndTimeBeforeStartTime_throwsIllegalArgument() {
        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(17, 0),
                LocalTime.of(15, 0),
                "Test 01",
                5
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("End time must be after start time", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withUnknownResource_throwsResourceNotFound() {
                when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        BookingCreateRequest request = new BookingCreateRequest(
                9999L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        when(resourceRepository.existsById(9999L)).thenReturn(false);

        assertThrows(
                ResourceNotFoundException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withValidPayload_savesPendingBooking() {
                when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        when(resourceRepository.existsById(2L)).thenReturn(true);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(88L);
            booking.setCreatedAt(Instant.now());
            return booking;
        });

        BookingResponse response = bookingService.createBooking("user@unipilot.test", request);

        ArgumentCaptor<Booking> bookingCaptor = ArgumentCaptor.forClass(Booking.class);
        verify(bookingRepository).save(bookingCaptor.capture());
        Booking saved = bookingCaptor.getValue();

        assertEquals(2L, saved.getResourceId());
        assertEquals(7L, saved.getUserId());
        assertEquals("PENDING", response.status());
        assertEquals(88L, response.id());
    }
}
