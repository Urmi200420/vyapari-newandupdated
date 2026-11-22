package com.vyapari.otp;

/** Something that can deliver a code to a person. The real one sends an email; tests use a fake one. */
public interface OtpSender {
    /** reason is a short phrase for the message, e.g. "login" or "password reset" */
    void send(String email, String reason, String code, int minutesValid);
}