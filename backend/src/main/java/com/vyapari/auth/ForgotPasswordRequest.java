package com.vyapari.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Please enter your email.")
        @Email(message = "Please enter a valid email address.")
        String email
) {}
