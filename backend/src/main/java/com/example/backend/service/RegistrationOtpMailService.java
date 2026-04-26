package com.example.backend.service;

import com.example.backend.exception.OtpDeliveryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
public class RegistrationOtpMailService {

    private static final Logger log = LoggerFactory.getLogger(RegistrationOtpMailService.class);
    private static final DateTimeFormatter UTC_DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneOffset.UTC);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String otpSubject;
    private final String mailUsername;

    public RegistrationOtpMailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from:}") String fromAddress,
            @Value("${app.mail.otp.subject:UniPilot verification code}") String otpSubject,
            @Value("${spring.mail.username:}") String mailUsername
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.otpSubject = otpSubject;
        this.mailUsername = mailUsername;
    }

    public void sendRegistrationOtpEmail(String recipientEmail, String fullName, String otp, Instant expiresAt) {
        if (mailUsername == null || mailUsername.isBlank()) {
            throw new OtpDeliveryException("Email service is not configured. Set MAIL_USERNAME in backend/.env");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(recipientEmail);

        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }

        message.setSubject(otpSubject);
        message.setText(buildEmailBody(fullName, otp, expiresAt));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.error("Failed to send registration OTP email to {}: {}", recipientEmail, ex.getMessage(), ex);
            throw new OtpDeliveryException("Unable to deliver verification OTP email. Please try again.");
        }
    }

    private String buildEmailBody(String fullName, String otp, Instant expiresAt) {
        String name = fullName == null || fullName.trim().isBlank() ? "there" : fullName.trim();
        String formattedExpiry = UTC_DATE_TIME_FORMATTER.format(expiresAt);

        return "Hello " + name + ",\n\n"
                + "Your UniPilot email verification code is: " + otp + "\n\n"
                + "This OTP expires in 5 minutes at " + formattedExpiry + " UTC.\n\n"
                + "If you did not request this code, please ignore this email.\n\n"
                + "- UniPilot Team";
    }

    public void sendBookingStatusEmail(String to, String userName, String resourceName, String status, String date, String startTime, String endTime) {
        if (mailUsername == null || mailUsername.isBlank()) {
            log.warn("Email service is not configured. Skipping booking status email.");
            return;
        }

        // Null safety checks
        if (to == null || to.isBlank()) {
            log.warn("Cannot send booking status email: recipient email is null or blank");
            return;
        }

        String name = userName == null || userName.trim().isBlank() ? "there" : userName.trim();
        String formattedStatus = status != null ? status.toUpperCase() : "UPDATED";

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);

        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }

        message.setSubject("Booking Status Update");
        message.setText(buildBookingStatusEmailBody(name, resourceName, formattedStatus, date, startTime, endTime));

        try {
            mailSender.send(message);
            System.out.println("Sending booking status email to: " + to);
            log.info("Booking status email sent to {} for resource {}", to, resourceName);
        } catch (MailException ex) {
            log.error("Failed to send booking status email to {}: {}", to, ex.getMessage(), ex);
        }
    }

    private String buildBookingStatusEmailBody(String userName, String resourceName, String status, String date, String startTime, String endTime) {
        String resource = resourceName != null ? resourceName : "N/A";
        String bookingDate = date != null ? date : "N/A";
        String start = startTime != null ? startTime : "N/A";
        String end = endTime != null ? endTime : "N/A";
        
        String statusWithEmoji = "APPROVED".equals(status) ? "APPROVED ✅" : "REJECTED ⛔";

        return "👋 Hello " + userName + ",\n\n"
                + "Your booking has been " + statusWithEmoji + "\n\n"
                + "Resource: " + resource + "\n"
                + "Date: " + bookingDate + "\n"
                + "Time: " + start + " - " + end + "\n\n"
                + "Thank you.\n\n"
                + "🎓 UniPilot Team";
    }
}
