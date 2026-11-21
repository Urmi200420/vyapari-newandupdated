package com.vyapari.auth;

import com.vyapari.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final SellerProfileRepository sellers;
    private final PasswordEncoder encoder;

    public AuthService(UserRepository users, SellerProfileRepository sellers, PasswordEncoder encoder) {
        this.users = users;
        this.sellers = sellers;
        this.encoder = encoder;
    }

    /** Sign-up. Only customers and sellers can register themselves. */
    @Transactional
    public UserResponse register(RegisterRequest req) {
        Role role;
        try {
            role = Role.valueOf(req.role().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose customer or seller.");
        }
        if (role != Role.CUSTOMER && role != Role.SELLER) {
            // delivery partners and admins are created by an admin, never by themselves
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only customers and sellers can sign up here.");
        }
        if (role == Role.SELLER && (req.shopName() == null || req.shopName().trim().length() < 2)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter your shop name.");
        }

        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "This email is already registered. Try logging in.");
        }

        User user = new User();
        user.setName(req.name().trim().replaceAll("\\s+", " "));
        user.setEmail(email);
        user.setPhone(req.phone());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setRole(role);
        // customers can start shopping at once; sellers wait until an admin approves them
        user.setStatus(role == Role.SELLER ? UserStatus.PENDING : UserStatus.ACTIVE);
        users.save(user);

        String shopName = null;
        if (role == Role.SELLER) {
            SellerProfile profile = new SellerProfile();
            profile.setUser(user);
            profile.setShopName(req.shopName().trim());
            profile.setCity(req.city() == null ? null : req.city().trim());
            sellers.save(profile);
            shopName = profile.getShopName();
        }
        return UserResponse.of(user, shopName);
    }

    /** Runs after the password is already proven right. Stops people who are not allowed in yet. */
    public User checkMayLogin(String email, String wantedRole) {
        User user = users.findByEmail(email.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));

        if (wantedRole != null && !wantedRole.isBlank()
                && !user.getRole().name().equalsIgnoreCase(wantedRole.trim())) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "This login is only for " + wantedRole.trim().toLowerCase(Locale.ROOT) + " accounts.");
        }
        switch (user.getStatus()) {
            case PENDING -> throw new ApiException(HttpStatus.FORBIDDEN,
                    "Your seller account is waiting for admin approval. We will let you in as soon as it is approved.");
            case REJECTED -> throw new ApiException(HttpStatus.FORBIDDEN, "Your seller application was not approved.");
            case BLOCKED -> throw new ApiException(HttpStatus.FORBIDDEN, "Your account has been blocked. Please contact support.");
            default -> { /* ACTIVE: fine */ }
        }
        return user;
    }

    public UserResponse toResponse(User user) {
        String shop = user.getRole() == Role.SELLER
                ? sellers.findByUserId(user.getId()).map(SellerProfile::getShopName).orElse(null)
                : null;
        return UserResponse.of(user, shop);
    }

    /** The logged-in user, or null if the account was deleted, blocked or is no longer active. */
    public User findActive(String email) {
        return users.findByEmail(email)
                .filter(u -> u.getDeletedAt() == null && u.getStatus() == UserStatus.ACTIVE)
                .orElse(null);
    }
}
