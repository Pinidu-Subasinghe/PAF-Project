package com.example.backend.service;

import com.example.backend.dto.request.BookingCreateRequest;
import com.example.backend.dto.request.BookingRejectRequest;
import com.example.backend.dto.request.BookingUpdateRequest;
import com.example.backend.dto.response.BookingResponse;
import com.example.backend.entity.AppUser;
import com.example.backend.entity.Booking;
import com.example.backend.entity.Resource;
import com.example.backend.enums.BookingStatus;
import com.example.backend.enums.NotificationType;
import com.example.backend.enums.Role;
import com.example.backend.exception.BookingConflictException;
import com.example.backend.exception.BookingNotFoundException;
import com.example.backend.exception.CapacityExceededException;
import com.example.backend.exception.InvalidTimeException;
import com.example.backend.exception.ResourceNotFoundException;
import com.example.backend.exception.UserNotFoundException;
import com.example.backend.repository.BookingRepository;
import com.example.backend.repository.ResourceRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.NotificationService;
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
    private final NotificationService notificationService;

    public BookingService(
            BookingRepository bookingRepository,
            UserRepository userRepository,
            ResourceRepository resourceRepository,
            NotificationService notificationService
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.resourceRepository = resourceRepository;
        this.notificationService = notificationService;
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

        Booking saved = bookingRepository.save(booking);

        // notify admins about new booking request
        String title = "New booking request";
        String message = String.format(
            "New booking request for resource %s on %s (%s-%s) by %s",
            resource.getName(),
            request.date(),
            request.startTime(),
            request.endTime(),
            user.getFullName() != null ? user.getFullName() : user.getEmail()
        );

        notificationService.createNotificationsForRole(
            Role.ADMIN,
            NotificationType.BOOKING_REQUEST,
            title,
            message,
            "manage-bookings"
        );

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(String userEmail) {
        AppUser user = findUserByEmail(userEmail);
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(booking -> !booking.isDeletedForUser())
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings(BookingStatus status) {
        List<Booking> bookings = status == null
                ? bookingRepository.findAllByOrderByCreatedAtDesc()
                : bookingRepository.findByStatusOrderByCreatedAtDesc(status);

        return bookings.stream()
            .filter(booking -> !booking.isDeletedForAdmin())
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public BookingResponse approveBooking(Long bookingId, String adminEmail) {
        Booking booking = findBooking(bookingId);
        ensurePendingForDecision(booking, "approve");

        booking.setStatus(BookingStatus.APPROVED);
        booking.setRejectionReason(null);
        Booking saved = bookingRepository.save(booking);

        // notify booking owner
        AppUser admin = findUserByEmail(adminEmail);
        String title = "Your booking has been approved";
        String message = String.format(
                "Your booking has been approved by %s",
                admin.getFullName() != null ? admin.getFullName() : admin.getEmail()
        );

        notificationService.createNotificationForUserId(
                booking.getUserId(),
                NotificationType.BOOKING_DECISION,
                title,
                message,
                "my-bookings"
        );

        return toResponse(saved);
    }

    @Transactional
    public BookingResponse rejectBooking(Long bookingId, BookingRejectRequest request, String adminEmail) {
        Booking booking = findBooking(bookingId);
        ensurePendingForDecision(booking, "reject");

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(request.reason().trim());
        Booking saved = bookingRepository.save(booking);

        AppUser admin = findUserByEmail(adminEmail);
        String title = "Your booking has been rejected";
        String message = String.format(
                "Your booking has been rejected by %s",
                admin.getFullName() != null ? admin.getFullName() : admin.getEmail()
        );

        notificationService.createNotificationForUserId(
                booking.getUserId(),
                NotificationType.BOOKING_DECISION,
                title,
                message,
                "my-bookings"
        );

        return toResponse(saved);
    }

    @Transactional
    public BookingResponse updateBooking(Long bookingId, String userEmail, BookingUpdateRequest request) {
        Booking booking = findBooking(bookingId);
        AppUser user = findUserByEmail(userEmail);

        // Only allow update if user owns the booking and it's still pending
        if (!booking.getUserId().equals(user.getId())) {
            throw new UserNotFoundException("User not authorized to update this booking");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Only pending bookings can be updated");
        }

        Resource resource = findResourceById(booking.getResourceId());

        validateDate(request.date());
        validateTimeWindow(request.startTime(), request.endTime());
        validateResourceAvailability(
            request.startTime(),
            request.endTime(),
            resource.getAvailableFrom(),
            resource.getAvailableTo()
        );
        validateCapacity(request.attendees(), resource.getCapacity());

        // Check for conflicts excluding this booking itself
        validateUpdateBookingConflict(
            bookingId,
            booking.getResourceId(),
            request.date(),
            request.startTime(),
            request.endTime()
        );

        booking.setDate(request.date());
        booking.setStartTime(request.startTime());
        booking.setEndTime(request.endTime());
        booking.setPurpose(request.purpose().trim());
        booking.setAttendees(request.attendees());

        Booking saved = bookingRepository.save(booking);
        return toResponse(saved);
    }

    private void validateUpdateBookingConflict(
            Long currentBookingId,
            Long resourceId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    ) {
        List<Booking> existingBookings = bookingRepository.findByResourceIdAndDate(resourceId, date);

        boolean hasConflict = existingBookings.stream()
                .filter(booking -> !booking.getId().equals(currentBookingId))
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

    @Transactional
    public void deleteBooking(Long bookingId, String actorEmail) {
        Booking booking = findBooking(bookingId);

        AppUser actor = findUserByEmail(actorEmail);

        // If a non-admin deletes a booking, ensure they own it.
        if (actor.getRole() != Role.ADMIN) {
            if (!booking.getUserId().equals(actor.getId())) {
                throw new UserNotFoundException("User not authorized to delete this booking");
            }

            // If booking is pending, delete it permanently from database
            if (booking.getStatus() == BookingStatus.PENDING) {
                bookingRepository.delete(booking);
                
                // Notify admins that user deleted the pending booking
                String title = "Pending booking deleted by user";
                String message = String.format(
                    "Pending booking for resource id %d was permanently deleted by %s",
                        booking.getResourceId(),
                        actor.getFullName() != null ? actor.getFullName() : actor.getEmail()
                );

                notificationService.createNotificationsForRole(
                        Role.ADMIN,
                        NotificationType.BOOKING_CANCELLED,
                        title,
                        message,
                        "manage-bookings"
                );
                return;
            }

            // For non-pending bookings, use soft deletion
            booking.setDeletedForUser(true);

            // Notify admins that user cancelled the booking.
            String title = "Booking canceled by user";
            String message = String.format(
                "Booking for resource id %d was canceled by %s",
                    booking.getResourceId(),
                    actor.getFullName() != null ? actor.getFullName() : actor.getEmail()
            );

            persistOrDeleteIfHiddenForBoth(booking);

            notificationService.createNotificationsForRole(
                    Role.ADMIN,
                    NotificationType.BOOKING_CANCELLED,
                    title,
                    message,
                    "manage-bookings"
            );
            return;
        }

        booking.setDeletedForAdmin(true);

        AppUser admin = actor;
        String title = "Your booking has been canceled";
        String message = String.format(
            "Your booking has been canceled by %s",
                admin.getFullName() != null ? admin.getFullName() : admin.getEmail()
        );

        persistOrDeleteIfHiddenForBoth(booking);

        notificationService.createNotificationForUserId(
                booking.getUserId(),
                NotificationType.BOOKING_CANCELLED,
                title,
                message,
                "my-bookings"
        );
    }

    private void persistOrDeleteIfHiddenForBoth(Booking booking) {
        if (booking.isDeletedForUser() && booking.isDeletedForAdmin()) {
            bookingRepository.delete(booking);
            return;
        }

        bookingRepository.save(booking);
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
        Resource resource = findResourceById(booking.getResourceId());
        return new BookingResponse(
                booking.getId(),
                booking.getResourceId(),
                resource.getType().name(),
                resource.getName(),
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
