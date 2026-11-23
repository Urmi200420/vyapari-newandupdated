package com.vyapari.auth;

import jakarta.validation.constraints.*;

/**
 * What the sign-up form sends.
 * role is "customer" or "seller" (any letter case). shopName / city are only used for sellers.
 */
public record RegisterRequest(
        @NotBlank(message = "Please enter your name.")
        @Size(min = 2, max = 80, message = "Name must be 2 to 80 letters.")
        String name,

        @NotBlank(message = "Please enter your email.")
        @Email(message = "Please enter a valid email address.")
        @Size(max = 150, message = "Email is too long.")
        String email,

        @NotBlank(message = "Please enter your mobile number.")
        @Pattern(regexp = "[6-9][0-9]{9}", message = "Enter a valid 10-digit mobile number.")
        String phone,

        @NotBlank(message = "Please choose a password.")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters.")
        String password,

        @NotBlank(message = "Please choose customer or seller.")
        String role,

        @Size(max = 80, message = "Shop name is too long.")
        String shopName,

        @Size(max = 60, message = "City is too long.")
        String city
) {}