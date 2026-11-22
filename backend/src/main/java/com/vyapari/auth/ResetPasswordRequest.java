package com.vyapari.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Please enter your email.") String email,
        @NotBlank(message = "Please enter the 6-digit code.") @Size(max = 12, message = "That code is not correct.") String code,
        @NotBlank(message = "Please choose a new password.")
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters.")
        String newPassword
) {}
