package com.vyapari.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * role is optional. The admin and delivery login pages send it ("admin" / "delivery"),
 * so a customer cannot get in through the staff door.
 */
public record LoginRequest(
        @NotBlank(message = "Please enter your email.") String email,
        @NotBlank(message = "Please enter your password.") String password,
        String role
) {}