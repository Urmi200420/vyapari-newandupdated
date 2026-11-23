package com.vyapari.admin;

import com.vyapari.auth.ApiException;
import com.vyapari.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Admin-only (SecurityConfig already limits /api/admin/** to ROLE_ADMIN).
 *
 *   GET  /api/admin/sellers                  all sellers (newest first)
 *   GET  /api/admin/sellers?status=PENDING   only one status
 *   POST /api/admin/sellers/{id}/approve     PENDING or REJECTED -> ACTIVE
 *   POST /api/admin/sellers/{id}/reject      PENDING            -> REJECTED
 *   POST /api/admin/sellers/{id}/block       ACTIVE             -> BLOCKED
 *   POST /api/admin/sellers/{id}/unblock     BLOCKED            -> ACTIVE
 *
 * {id} is the user id. Every action returns the updated seller.
 */
@RestController
@RequestMapping("/api/admin/sellers")
public class AdminSellerController {

    public record SellerView(Long id, String name, String email, String phone,
                             String shopName, String city, String status, Instant createdAt) {}

    private final UserRepository users;
    private final SellerProfileRepository profiles;

    public AdminSellerController(UserRepository users, SellerProfileRepository profiles) {
        this.users = users;
        this.profiles = profiles;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<SellerView> list(@RequestParam(required = false) String status) {
        UserStatus wanted = null;
        if (status != null && !status.isBlank()) {
            try {
                wanted = UserStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown status: " + status);
            }
        }
        final UserStatus filter = wanted;
        return users.findByRoleAndDeletedAtIsNullOrderByCreatedAtDesc(Role.SELLER).stream()
                .filter(u -> filter == null || u.getStatus() == filter)
                .map(this::view)
                .toList();
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public SellerView approve(@PathVariable Long id) {
        return move(id, UserStatus.ACTIVE, UserStatus.PENDING, UserStatus.REJECTED);
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public SellerView reject(@PathVariable Long id) {
        return move(id, UserStatus.REJECTED, UserStatus.PENDING);
    }

    @PostMapping("/{id}/block")
    @Transactional
    public SellerView block(@PathVariable Long id) {
        return move(id, UserStatus.BLOCKED, UserStatus.ACTIVE);
    }

    @PostMapping("/{id}/unblock")
    @Transactional
    public SellerView unblock(@PathVariable Long id) {
        return move(id, UserStatus.ACTIVE, UserStatus.BLOCKED);
    }

    /** Changes the seller's status, but only from one of the allowed current statuses. */
    private SellerView move(Long id, UserStatus to, UserStatus... allowedFrom) {
        User u = users.findById(id)
                .filter(x -> x.getRole() == Role.SELLER && x.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Seller not found."));
        boolean allowed = false;
        for (UserStatus s : allowedFrom) if (u.getStatus() == s) allowed = true;
        if (!allowed) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This seller is " + u.getStatus() + ", so that action is not possible.");
        }
        u.setStatus(to);
        users.save(u);
        return view(u);
    }

    private SellerView view(User u) {
        SellerProfile p = profiles.findByUserId(u.getId()).orElse(null);
        return new SellerView(u.getId(), u.getName(), u.getEmail(), u.getPhone(),
                p == null ? null : p.getShopName(), p == null ? null : p.getCity(),
                u.getStatus().name(), u.getCreatedAt());
    }
}