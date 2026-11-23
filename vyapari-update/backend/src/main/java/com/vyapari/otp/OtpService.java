package com.vyapari.otp;

import com.vyapari.auth.ApiException;
import com.vyapari.mail.Mailer;
import com.vyapari.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

/**
 * E-mail verification codes (6 digits) for delivery-partner and customer registration.
 *   send   -> e-mails a new code (10 min), with a resend cooldown and an hourly limit
 *   verify -> 5 attempts per code; success returns a one-time token (30 min)
 *   consume-> the registration endpoint redeems the token once, for the same e-mail
 */
@Service
public class OtpService {
    public static final String DELIVERY_REGISTRATION = "DELIVERY_REGISTRATION";
    public static final String CUSTOMER_REGISTRATION = "CUSTOMER_REGISTRATION";
    private static final Duration TOKEN_LIFETIME = Duration.ofMinutes(30);

    private final EmailOtpRepository otps;
    private final UserRepository users;
    private final Mailer mailer;
    private final SecureRandom random = new SecureRandom();
    private final int codeMinutes, resendSeconds, maxSendsPerHour, maxAttempts;

    public OtpService(EmailOtpRepository otps, UserRepository users, Mailer mailer,
                      @Value("${vyapari.otp.code-minutes:10}") int codeMinutes,
                      @Value("${vyapari.otp.resend-seconds:60}") int resendSeconds,
                      @Value("${vyapari.otp.max-sends-per-hour:5}") int maxSendsPerHour,
                      @Value("${vyapari.otp.max-attempts:5}") int maxAttempts) {
        this.otps = otps;
        this.users = users;
        this.mailer = mailer;
        this.codeMinutes = codeMinutes;
        this.resendSeconds = resendSeconds;
        this.maxSendsPerHour = maxSendsPerHour;
        this.maxAttempts = maxAttempts;
    }

    public record SendResult(String email, int expiresInSeconds, int resendInSeconds) {}
    public record VerifyResult(String email, String verificationToken, int validForSeconds) {}

    @Transactional
    public SendResult send(String rawEmail, String purpose) {
        String email = normalise(rawEmail);
        checkPurpose(purpose);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "This email is already registered. Try logging in.");
        }
        Instant now = Instant.now();
        otps.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose).ifPresent(last -> {
            long wait = resendSeconds - Duration.between(last.getCreatedAt(), now).getSeconds();
            if (wait > 0) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Please wait " + wait + " seconds before requesting a new code.");
        });
        if (otps.countByEmailAndPurposeAndCreatedAtAfter(email, purpose, now.minus(Duration.ofHours(1))) >= maxSendsPerHour) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many codes requested for this email. Please try again in an hour.");
        }
        // older unverified codes stop working as soon as a new one is issued
        otps.findByEmailAndPurposeAndVerifiedAtIsNull(email, purpose).forEach(o -> {
            o.setExpiresAt(now);
            otps.save(o);
        });

        String code = String.format("%06d", random.nextInt(1_000_000));
        EmailOtp otp = new EmailOtp();
        otp.setEmail(email);
        otp.setPurpose(purpose);
        otp.setCodeHash(hash(email + "|" + purpose + "|" + code));
        otp.setExpiresAt(now.plus(Duration.ofMinutes(codeMinutes)));
        otps.save(otp);

        // if sending fails the transaction rolls back, so a failed e-mail does not count against the limits
        String what = DELIVERY_REGISTRATION.equals(purpose) ? "delivery-partner application" : "Vyapari account";
        mailer.send(email, "Your Vyapari verification code: " + code,
                "Hello,\n\nYour verification code for your " + what + " is: " + code + "\n\n"
                        + "It expires in " + codeMinutes + " minutes. Do not share this code with anyone.\n"
                        + "If you did not sign up for Vyapari, you can ignore this e-mail.\n\n"
                        + "- Team Vyapari");
        return new SendResult(email, codeMinutes * 60, resendSeconds);
    }

    /** Wrong attempts are counted even though an error is returned (noRollbackFor). */
    @Transactional(noRollbackFor = ApiException.class)
    public VerifyResult verify(String rawEmail, String purpose, String rawCode) {
        String email = normalise(rawEmail);
        checkPurpose(purpose);
        String code = rawCode == null ? "" : rawCode.trim();
        if (!code.matches("[0-9]{6}")) throw new ApiException(HttpStatus.BAD_REQUEST, "Enter the 6-digit code from the email.");
        EmailOtp otp = otps.findFirstByEmailAndPurposeOrderByCreatedAtDesc(email, purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Please request a verification code first."));
        Instant now = Instant.now();
        if (otp.getVerifiedAt() != null) throw new ApiException(HttpStatus.BAD_REQUEST, "This code was already used. Please request a new one.");
        if (now.isAfter(otp.getExpiresAt())) throw new ApiException(HttpStatus.BAD_REQUEST, "This code has expired. Please request a new one.");
        if (otp.getAttempts() >= maxAttempts) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many wrong attempts. Please request a new code.");
        }
        if (!MessageDigest.isEqual(otp.getCodeHash().getBytes(StandardCharsets.UTF_8),
                hash(email + "|" + purpose + "|" + code).getBytes(StandardCharsets.UTF_8))) {
            otp.setAttempts(otp.getAttempts() + 1);
            otps.save(otp);
            int left = maxAttempts - otp.getAttempts();
            throw new ApiException(HttpStatus.BAD_REQUEST, left > 0
                    ? "Incorrect code. " + left + " attempt" + (left == 1 ? "" : "s") + " left."
                    : "Too many wrong attempts. Please request a new code.");
        }
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        otp.setVerifiedAt(now);
        otp.setTokenHash(hash(token));
        otp.setTokenExpiresAt(now.plus(TOKEN_LIFETIME));
        otps.save(otp);
        return new VerifyResult(email, token, (int) TOKEN_LIFETIME.getSeconds());
    }

    /** Redeems the token once. Must run inside the caller's transaction so a failed registration keeps it usable. */
    @Transactional
    public void consume(String rawEmail, String purpose, String token) {
        String email = normalise(rawEmail);
        if (token == null || token.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please verify your email address with the code we send you.");
        }
        EmailOtp otp = otps.findFirstByEmailAndPurposeAndTokenHash(email, purpose, hash(token.trim()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Your email verification is not valid for this address. Please verify your email again."));
        if (otp.getConsumedAt() != null || otp.getTokenExpiresAt() == null || Instant.now().isAfter(otp.getTokenExpiresAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your email verification has expired. Please verify your email again.");
        }
        otp.setConsumedAt(Instant.now());
        otps.save(otp);
    }

    private static void checkPurpose(String purpose) {
        if (!DELIVERY_REGISTRATION.equals(purpose) && !CUSTOMER_REGISTRATION.equals(purpose)) throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown verification purpose.");
    }

    private static String normalise(String email) {
        String e = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (!e.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+") || e.length() > 150) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid email address.");
        }
        return e;
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
