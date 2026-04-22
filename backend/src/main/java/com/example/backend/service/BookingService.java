package com.example.backend.service;

import com.example.backend.dto.request.BookingCreateRequest;
import com.example.backend.dto.request.BookingRejectRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Resource;
import com.example.backend.enums.BookingStatus;
import com.example.backend.exception.BookingConflictException;
import com.example.backend.exception.BookingNotFoundException;
import com.example.backend.exception.CapacityExceededException;
import com.example.backend.exception.InvalidTimeException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.ResourceRepository;
import com.example.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;

    public BookingService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            ResourceRepository resourceRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
    }

    @Transactional
    public BookingResponse createBooking(String userEmail, BookingCreateRequest request) {
        validateCreateRequest(request);
        AppUser user = findUserByEmail(userEmail);
        Resource resource = findResourceById(request.resourceId());

        validateDate(request.date());
        validateTimeWindow(request.startTime(), request.endTime());
        validateResourceAvailability(
            request.startTime(),
            request.endTime(),
            resource.getAvailableFrom(),
            resource.getAvailableTo()
        );
        validateCapacity(request.attendees(), resource.getCapacity());
        validateBookingConflict(
            request.resourceId(),
            request.date(),
            request.startTime(),
            request.endTime()
        );

        Booking booking = new Booking();
        booking.setResourceId(request.resourceId());
        booking.setUserId(user.getId());
        booking.setDate(request.date());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setPurpose(request.purpose().trim());
        booking.setAttendees(request.attendees());
        booking.setStatus(BookingStatus.PENDING);

        return toResponse(bookingRepository.save(booking));
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(String userEmail) {
        AppUser user = findUserByEmail(userEmail);
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings(BookingStatus status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAllByOrderByCreatedAtDesc()
                : bookingRepository.findByStatusOrderByCreatedAtDesc(status);

        return bookings.stream().map(this::toResponse).toList();
    }

    @Transactional
    public BookingResponse approveBooking(Long bookingId) {
        Booking booking = findBooking(bookingId);
        ensurePendingForDecision(booking, "approve");

        booking.setStatus(BookingStatus.APPROVED);
        booking.setRejectionReason(null);
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse rejectBooking(Long bookingId, BookingRejectRequest request) {
        Booking booking = findBooking(bookingId);
        ensurePendingForDecision(booking, "reject");

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(request.reason().trim());
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse cancelBooking(Long bookingId) {
        Booking booking = findBooking(bookingId);

        if (booking.getStatus() == BookingStatus.CANCELLED) {
            throw new IllegalArgumentException("Booking is already cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return toResponse(bookingRepository.save(booking));
    }

    private AppUser findUserByEmail(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private Booking findBooking(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException("Booking not found"));
    }

    private Resource findResourceById(Long resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    private void validateDate(LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            throw new InvalidTimeException("Date cannot be in the past", "date");
        }
    }

    private void validateTimeWindow(java.time.LocalTime startTime, java.time.LocalTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new InvalidTimeException("End time must be after start time", "endTime");
        }
    }

    private void validateResourceAvailability(
            LocalTime startTime,
            LocalTime endTime,
            LocalTime availableFrom,
            LocalTime availableTo
    ) {
        if (availableFrom == null || availableTo == null || !availableTo.isAfter(availableFrom)) {
            throw new InvalidTimeException(
                    "Resource available time is not configured for this resource.",
                    "resourceId"
            );
        }

        if (startTime.isBefore(availableFrom)) {
            throw new InvalidTimeException(
                    "Start time must be within resource available time.",
                    "startTime"
            );
        }

        if (endTime.isAfter(availableTo)) {
            throw new InvalidTimeException(
                    "End time must be within resource available time.",
                    "endTime"
            );
        }
    }

    private void validateCapacity(Integer attendees, Integer capacity) {
        if (capacity == null || capacity < 1) {
            throw new CapacityExceededException(
                    "Resource capacity is not configured for this resource.",
                    "resourceId"
            );
        }

        if (attendees > capacity) {
            throw new CapacityExceededException(
                    "Number of attendees exceeds resource capacity (Max: " + capacity + ").",
                    "attendees"
            );
        }
    }

    private void validateBookingConflict(
            Long resourceId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    ) {
        List<Booking> existingBookings = bookingRepository.findByResourceIdAndDate(resourceId, date);

        boolean hasConflict = existingBookings.stream()
                .filter(booking -> booking.getStatus() != BookingStatus.CANCELLED)
                .filter(booking -> booking.getStatus() != BookingStatus.REJECTED)
                .anyMatch(booking ->
                        booking.getStartTime().isBefore(endTime)
                                && booking.getEndTime().isAfter(startTime)
                );

        if (hasConflict) {
            throw new BookingConflictException(
                    "This resource is already booked for the selected time range.",
                    "time"
            );
        }
    }

    private void validateCreateRequest(BookingCreateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request payload is required");
        }

        if (request.resourceId() == null || request.resourceId() < 1) {
            throw new IllegalArgumentException("Resource ID must be greater than 0");
        }

        if (request.date() == null) {
            throw new IllegalArgumentException("Date is required");
        }

        if (request.startTime() == null) {
            throw new IllegalArgumentException("Start time is required");
        }

        if (request.endTime() == null) {
            throw new IllegalArgumentException("End time is required");
        }

        if (request.purpose() == null || request.purpose().isBlank()) {
            throw new IllegalArgumentException("Purpose is required");
        }

        if (request.purpose().trim().length() > 500) {
            throw new IllegalArgumentException("Purpose must be at most 500 characters");
        }

        if (request.attendees() == null) {
            throw new IllegalArgumentException("Expected attendees is required");
        }

        if (request.attendees() < 1) {
            throw new IllegalArgumentException("Expected attendees must be at least 1");
        }

        validateTimeWindow(request.startTime(), request.endTime());
    }

    private void ensurePendingForDecision(Booking booking, String actionName) {
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be " + actionName);
        }
    }

    private BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getResourceId(),
                booking.getUserId(),
                booking.getDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getPurpose(),
                booking.getAttendees(),
                booking.getStatus().name(),
                booking.getRejectionReason(),
                booking.getCreatedAt()
        );
    }
}
