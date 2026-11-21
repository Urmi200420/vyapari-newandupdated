package com.vyapari.user;

/**
 * ACTIVE   - can log in
 * PENDING  - a seller waiting for admin approval
 * REJECTED - seller application refused by the admin
 * BLOCKED  - banned by the admin
 * (the admin screens use these same words)
 */
public enum UserStatus {
    ACTIVE, PENDING, REJECTED, BLOCKED
}