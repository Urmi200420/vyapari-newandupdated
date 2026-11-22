package com.vyapari.auth;

/** Sent after a correct password when a code is also needed. The React login page shows the code box. */
public record OtpChallengeResponse(boolean otpRequired, String email, String maskedEmail, String message) {}
