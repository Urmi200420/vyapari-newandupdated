package com.vyapari.otp;

import org.springframework.web.bind.annotation.*;

/**
 *   POST /api/auth/otp/send    { email, purpose }         -> e-mails a 6-digit code
 *   POST /api/auth/otp/verify  { email, purpose, code }   -> { verificationToken }
 * purpose: "DELIVERY_REGISTRATION" (token goes in the delivery application's multipart field "emailVerificationToken")
 *       or "CUSTOMER_REGISTRATION" (token goes in the sign-up JSON as "emailVerificationToken").
 */
@RestController
@RequestMapping("/api/auth/otp")
public class OtpController {
    public record SendRequest(String email, String purpose) {}
    public record VerifyRequest(String email, String purpose, String code) {}

    private final OtpService otp;

    public OtpController(OtpService otp) { this.otp = otp; }

    @PostMapping("/send")
    public OtpService.SendResult send(@RequestBody SendRequest r) {
        return otp.send(r.email(), r.purpose() == null ? OtpService.DELIVERY_REGISTRATION : r.purpose());
    }

    @PostMapping("/verify")
    public OtpService.VerifyResult verify(@RequestBody VerifyRequest r) {
        return otp.verify(r.email(), r.purpose() == null ? OtpService.DELIVERY_REGISTRATION : r.purpose(), r.code());
    }
}
