package com.vyapari.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** What the OTP and forgot-password requests send and receive. */
public final class OtpDtos {

    private OtpDtos() {}

    /** Reply to a correct email + password when a code is still needed. */
    public record OtpRequired(boolean otpRequired, String email, String maskedEmail, String message) {}

    public record Verify(
            @NotBlank(message = "Please enter your email.") String email,
            @NotBlank(message = "Please enter the 6-digit code.")
            @Pattern(regexp = "[0-9]{6}", message = "The code is 6 digits.") String code,
            String role) {}

    public record Forgot(
            @NotBlank(message = "Please enter your email.")
            @Email(message = "Please enter a valid email address.") String email) {}

    public record Reset(
            @NotBlank(message = "Please enter your email.") String email,
            @NotBlank(message = "Please enter the 6-digit code.")
            @Pattern(regexp = "[0-9]{6}", message = "The code is 6 digits.") String code,
            @NotBlank(message = "Please choose a new password.")
            @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters.") String newPassword) {}
}