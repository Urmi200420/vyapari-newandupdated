package com.vyapari.otp;

import com.vyapari.auth.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;

/** Creates, sends and checks one-time codes. A code works once, expires, and allows 5 wrong tries. */
@Service
public class OtpService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_TRIES = 5;
    private static final int RESEND_AFTER_SECONDS = 30;

    private final OtpTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final OtpSender sender;
    private final boolean enabled;
    private final int minutes;

    public OtpService(OtpTokenRepository tokens, PasswordEncoder encoder, OtpSender sender,
                      @Value("${vyapari.otp.enabled:true}") boolean enabled,
                      @Value("${vyapari.otp.minutes:10}") int minutes) {
        this.tokens = tokens;
        this.encoder = encoder;
        this.sender = sender;
        this.enabled = enabled;
        this.minutes = minutes;
    }

    /** false = two-step login is switched off (vyapari.otp.enabled=false) */
    public boolean enabled() {
        return enabled;
    }

    /** Makes a new 6-digit code for this email and sends it. Replaces any older code. */
    @Transactional
    public void issue(String email, OtpPurpose purpose) {
        OtpToken old = tokens.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose).orElse(null);
        if (old != null && old.getCreatedAt().plusSeconds(RESEND_AFTER_SECONDS).isAfter(Instant.now())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait " + RESEND_AFTER_SECONDS + " seconds before asking for another code.");
        }
        tokens.deleteByEmailAndPurpose(email, purpose);

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        OtpToken t = new OtpToken();
        t.setEmail(email);
        t.setPurpose(purpose);
        t.setCodeHash(encoder.encode(code));
        t.setExpiresAt(Instant.now().plusSeconds(minutes * 60L));
        tokens.save(t);

        sender.send(email, purpose == OtpPurpose.LOGIN ? "login" : "password reset", code, minutes);
    }

    /** Throws if the code is wrong, expired or already used. On success the code is used up. */
    @Transactional(noRollbackFor = ApiException.class)   // wrong tries must still be counted
    public void verify(String email, OtpPurpose purpose, String code) {
        OtpToken t = tokens.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired code. Please ask for a new one."));

        if (t.getExpiresAt().isBefore(Instant.now()) || t.getAttempts() >= MAX_TRIES) {
            tokens.delete(t);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired code. Please ask for a new one.");
        }
        if (code == null || !encoder.matches(code.trim(), t.getCodeHash())) {
            t.setAttempts(t.getAttempts() + 1);
            tokens.save(t);
            throw new ApiException(HttpStatus.BAD_REQUEST, "That code is not correct.");
        }
        tokens.delete(t);   // one use only
    }

    /** garai1981@gmail.com  ->  g*****@gmail.com */
    public String mask(String email) {
        int at = email.indexOf('@');
        if (at <= 1) return email;
        return email.charAt(0) + "*".repeat(Math.min(at - 1, 6)) + email.substring(at);
    }
}