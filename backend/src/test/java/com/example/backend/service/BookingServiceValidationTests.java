package com.example.backend.service;

import com.example.backend.dto.request.BookingCreateRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Resource;
import com.example.backend.enums.BookingStatus;
import com.example.backend.exception.BookingConflictException;
import com.example.backend.exception.CapacityExceededException;
import com.example.backend.exception.InvalidTimeException;
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
import java.util.List;
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
        void createBooking_withEndTimeBeforeStartTime_throwsInvalidTime() {
        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(17, 0),
                LocalTime.of(15, 0),
                "Test 01",
                5
        );

        InvalidTimeException ex = assertThrows(
                InvalidTimeException.class,
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

        when(resourceRepository.findById(9999L)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withDateInPast_throwsInvalidTime() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
                resource.setAvailableFrom(LocalTime.of(9, 0));
                resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now().minusDays(1),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        InvalidTimeException ex = assertThrows(
                InvalidTimeException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Date cannot be in the past", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withAttendeesBeyondCapacity_throwsCapacityExceeded() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(4);
        resource.setAvailableFrom(LocalTime.of(9, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        CapacityExceededException ex = assertThrows(
                CapacityExceededException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Number of attendees exceeds resource capacity (Max: 4).", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withOverlappingBooking_throwsBookingConflict() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(LocalTime.of(9, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        Booking existingBooking = new Booking();
        existingBooking.setStatus(BookingStatus.PENDING);
        existingBooking.setStartTime(LocalTime.of(10, 0));
        existingBooking.setEndTime(LocalTime.of(11, 0));
        when(bookingRepository.findByResourceIdAndDate(2L, LocalDate.now()))
                .thenReturn(List.of(existingBooking));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(10, 30),
                LocalTime.of(11, 30),
                "Test overlap",
                2
        );

        BookingConflictException ex = assertThrows(
                BookingConflictException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("This resource is already booked for the selected time range.", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withOverlappingCancelledBooking_allowsSave() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(LocalTime.of(9, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        Booking cancelledBooking = new Booking();
        cancelledBooking.setStatus(BookingStatus.CANCELLED);
        cancelledBooking.setStartTime(LocalTime.of(10, 0));
        cancelledBooking.setEndTime(LocalTime.of(11, 0));
        when(bookingRepository.findByResourceIdAndDate(2L, LocalDate.now()))
                .thenReturn(List.of(cancelledBooking));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(10, 30),
                LocalTime.of(11, 30),
                "Cancelled overlap should pass",
                2
        );

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking booking = invocation.getArgument(0);
            booking.setId(91L);
            booking.setCreatedAt(Instant.now());
            return booking;
        });

        BookingResponse response = bookingService.createBooking("user@unipilot.test", request);

        assertEquals(91L, response.id());
        verify(bookingRepository).save(any(Booking.class));
    }

    @Test
    void createBooking_withResourceCapacityMissing_throwsCapacityExceeded() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(null);
        resource.setAvailableFrom(LocalTime.of(9, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        CapacityExceededException ex = assertThrows(
                CapacityExceededException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Resource capacity is not configured for this resource.", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withStartTimeBeforeResourceAvailability_throwsInvalidTime() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(LocalTime.of(10, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(9, 30),
                LocalTime.of(11, 0),
                "Morning prep",
                3
        );

        InvalidTimeException ex = assertThrows(
                InvalidTimeException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Start time must be within resource available time.", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withEndTimeAfterResourceAvailability_throwsInvalidTime() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(LocalTime.of(10, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(17, 0),
                LocalTime.of(18, 30),
                "Evening session",
                3
        );

        InvalidTimeException ex = assertThrows(
                InvalidTimeException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("End time must be within resource available time.", ex.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void createBooking_withResourceAvailabilityMissing_throwsInvalidTime() {
        when(userRepository.findByEmail("user@unipilot.test")).thenReturn(Optional.of(user));

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(null);
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));

        BookingCreateRequest request = new BookingCreateRequest(
                2L,
                LocalDate.now(),
                LocalTime.of(15, 0),
                LocalTime.of(17, 0),
                "Test 01",
                5
        );

        InvalidTimeException ex = assertThrows(
                InvalidTimeException.class,
                () -> bookingService.createBooking("user@unipilot.test", request)
        );

        assertEquals("Resource available time is not configured for this resource.", ex.getMessage());
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

        Resource resource = new Resource();
        resource.setId(2L);
        resource.setCapacity(10);
        resource.setAvailableFrom(LocalTime.of(9, 0));
        resource.setAvailableTo(LocalTime.of(18, 0));
        when(resourceRepository.findById(2L)).thenReturn(Optional.of(resource));
                when(bookingRepository.findByResourceIdAndDate(2L, LocalDate.now())).thenReturn(List.of());
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
