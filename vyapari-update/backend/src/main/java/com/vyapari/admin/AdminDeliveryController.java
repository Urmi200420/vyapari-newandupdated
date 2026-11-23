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
 *   POST /api/admin/delivery-partners/{id}/reject     PENDING            -> REJECTED   body { "reason": "..." } (required)
 *   POST /api/admin/delivery-partners/{id}/block      ACTIVE             -> BLOCKED
 *   POST /api/admin/delivery-partners/{id}/unblock    BLOCKED            -> ACTIVE
 */
@RestController
@RequestMapping("/api/admin/delivery-partners")
public class AdminDeliveryController {

    /**
     * What the admin sees. Government ID and licence numbers are decrypted only to be masked (last 4 characters);
     * private storage keys are never sent, only whether each document exists. Documents are fetched through
     * GET /api/admin/delivery-partners/{id}/documents/{identity|licence|vehicle-rc}.
     */
    public record DeliveryView(
            Long id, String name, String email, String phone, String status, Instant createdAt,
            java.time.LocalDate dateOfBirth, String address, String city, String pincode,
            String identityDocumentType, String identityDocumentNumberMasked, boolean hasIdentityDocument,
            String vehicleType, String vehicleNumber, String drivingLicenseNumberMasked,
            boolean hasLicenceDocument, boolean hasVehicleRcDocument, String emergencyContact,
            String serviceablePincodes, String availabilityPreference, String rejectionReason, Instant reviewedAt,
            String identityDocumentName, String vehicleOtherName, String deliveryExperience, String workingDays, String workingHours
    ) {}

    public record RejectRequest(String reason) {}

    private final UserRepository users;
    private final com.vyapari.auth.SensitiveDataCipher cipher;

    public AdminDeliveryController(UserRepository users, com.vyapari.auth.SensitiveDataCipher cipher) {
        this.users = users;
        this.cipher = cipher;
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
    public DeliveryView reject(@PathVariable Long id, @RequestBody(required = false) RejectRequest request) {
        User user = users.findById(id)
                .filter(x -> x.getRole() == Role.DELIVERY && x.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Delivery partner not found."));
        if (user.getStatus() != UserStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "Only pending applications can be rejected.");
        }
        String reason = request == null || request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please give the applicant a reason for the rejection (at least 5 characters).");
        }
        if (reason.length() > 500) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rejection reason cannot exceed 500 characters.");
        }
        user.setStatus(UserStatus.REJECTED);
        user.setRejectionReason(reason);
        user.setReviewedAt(Instant.now());
        return view(users.save(user));
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
        if (to == UserStatus.ACTIVE || to == UserStatus.REJECTED) {
            u.setReviewedAt(Instant.now());
        }
        if (to == UserStatus.ACTIVE) u.setRejectionReason(null);
        users.save(u);
        return view(u);
    }

    private DeliveryView view(User u) {
        return new DeliveryView(
                u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getStatus().name(), u.getCreatedAt(),
                u.getDateOfBirth(), u.getAddress(), u.getCity(), u.getPincode(),
                u.getIdentityDocumentType(), mask(cipher.decrypt(u.getIdentityDocumentNumber())), has(u.getIdentityDocumentPath()),
                u.getVehicleType(), u.getVehicleNumber(), mask(cipher.decrypt(u.getDrivingLicenseNumber())),
                has(u.getDrivingLicensePath()), has(u.getVehicleRcPath()), u.getEmergencyContact(),
                u.getServiceablePincodes(), u.getAvailabilityPreference(), u.getRejectionReason(), u.getReviewedAt(),
                u.getIdentityDocumentName(), u.getVehicleOtherName(), u.getDeliveryExperience(), u.getWorkingDays(), u.getWorkingHours()
        );
    }

    private static boolean has(String key) { return key != null && !key.isBlank(); }

    private String mask(String value) {
        if (value == null || value.isBlank()) return null;
        String digits = value.replaceAll("\\s+", "");
        if (digits.length() <= 4) return "••••";
        return "••••" + digits.substring(digits.length() - 4);
    }
}