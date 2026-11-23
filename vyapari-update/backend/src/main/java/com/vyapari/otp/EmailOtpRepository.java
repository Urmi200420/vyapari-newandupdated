package com.vyapari.otp;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    Optional<EmailOtp> findFirstByEmailAndPurposeOrderByCreatedAtDesc(String email, String purpose);
    long countByEmailAndPurposeAndCreatedAtAfter(String email, String purpose, Instant after);
    Optional<EmailOtp> findFirstByEmailAndPurposeAndTokenHash(String email, String purpose, String tokenHash);
    List<EmailOtp> findByEmailAndPurposeAndVerifiedAtIsNull(String email, String purpose);
}
