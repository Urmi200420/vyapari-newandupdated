package com.vyapari.user;

/**
 * ACTIVE   - can log in
 * PENDING  - a seller or delivery partner waiting for admin approval
 * REJECTED - seller / delivery application refused by the admin
 * BLOCKED  - banned by the admin
 */
public enum UserStatus { ACTIVE, PENDING, REJECTED, BLOCKED }
