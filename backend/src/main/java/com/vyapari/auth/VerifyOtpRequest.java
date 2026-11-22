package com.vyapari.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Step 2 of login: the 6-digit code from the email. role is optional, like in LoginRequest. */
public record VerifyOtpRequest(
        @NotBlank(message = "Please enter your email.") String email,
        @NotBlank(message = "Please enter the 6-digit code.") @Size(max = 12, message = "That code is not correct.") String code,
        String role
) {}
