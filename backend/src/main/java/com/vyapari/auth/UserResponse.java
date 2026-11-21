package com.vyapari.auth;

import com.vyapari.user.User;

/** What the front end receives about a person. Never contains the password. */
public record UserResponse(Long id, String name, String email, String phone, String role, String status, String shopName) {

    public static UserResponse of(User u, String shopName) {
        // role is lower case ("seller") because the React code compares it that way
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getPhone(),
                u.getRole().name().toLowerCase(), u.getStatus().name(), shopName);
    }
}