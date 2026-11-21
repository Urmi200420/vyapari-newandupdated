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
 *   GET  /api/admin/delivery-partners                 all delivery partners (newest first)
 *   GET  /api/admin/delivery-partners?status=PENDING  only one status
 *   POST /api/admin/delivery-partners/{id}/approve    PENDING or REJECTED -> ACTIVE
 *   POST /api/admin/delivery-partners/{id}/reject     PENDING            -> REJECTED
 *   POST /api/admin/delivery-partners/{id}/block      ACTIVE             -> BLOCKED
 *   POST /api/admin/delivery-partners/{id}/unblock    BLOCKED            -> ACTIVE
 */
@RestController
@RequestMapping("/api/admin/delivery-partners")
public class AdminDeliveryController {

    public record DeliveryView(Long id, String name, String email, String phone, String status, Instant createdAt) {}

    private final UserRepository users;

    public AdminDeliveryController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<DeliveryView> list(@RequestParam(required = false) String status) {
        UserStatus wanted = null;
        if (status != null && !status.isBlank()) {
            try {
                wanted = UserStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unknown status: " + status);
            }
        }
        final UserStatus filter = wanted;
        return users.findByRoleAndDeletedAtIsNullOrderByCreatedAtDesc(Role.DELIVERY).stream()
                .filter(u -> filter == null || u.getStatus() == filter)
                .map(this::view)
                .toList();
    }

    @PostMapping("/{id}/approve")
    @Transactional
    public DeliveryView approve(@PathVariable Long id) {
        return move(id, UserStatus.ACTIVE, UserStatus.PENDING, UserStatus.REJECTED);
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public DeliveryView reject(@PathVariable Long id) {
        return move(id, UserStatus.REJECTED, UserStatus.PENDING);
    }

    @PostMapping("/{id}/block")
    @Transactional
    public DeliveryView block(@PathVariable Long id) {
        return move(id, UserStatus.BLOCKED, UserStatus.ACTIVE);
    }

    @PostMapping("/{id}/unblock")
    @Transactional
    public DeliveryView unblock(@PathVariable Long id) {
        return move(id, UserStatus.ACTIVE, UserStatus.BLOCKED);
    }

    private DeliveryView move(Long id, UserStatus to, UserStatus... allowedFrom) {
        User u = users.findById(id)
                .filter(x -> x.getRole() == Role.DELIVERY && x.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Delivery partner not found."));
        boolean allowed = false;
        for (UserStatus s : allowedFrom) if (u.getStatus() == s) allowed = true;
        if (!allowed) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This delivery partner is " + u.getStatus() + ", so that action is not possible.");
        }
        u.setStatus(to);
        users.save(u);
        return view(u);
    }

    private DeliveryView view(User u) {
        return new DeliveryView(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getStatus().name(), u.getCreatedAt());
    }
}