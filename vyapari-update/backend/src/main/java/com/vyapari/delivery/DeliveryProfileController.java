package com.vyapari.delivery;

import com.vyapari.auth.ApiException;
import com.vyapari.auth.AuthService;
import com.vyapari.auth.SensitiveDataCipher;
import com.vyapari.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * The logged-in delivery partner's own account (ROLE_DELIVERY only, see SecurityConfig; the ActiveUserFilter
 * ends the session as soon as an admin blocks the account).
 *
 *   GET /api/delivery/profile   details captured by the registration wizard and approved by the admin
 *   PUT /api/delivery/profile   { name, phone, pincodes: ["700001", ...] }  - the fields a partner may change himself.
 *                               Vehicle, licence and ID details were verified by the admin and stay read-only.
 */
@RestController
@RequestMapping("/api/delivery/profile")
public class DeliveryProfileController {

    public record ProfileView(Long id, String name, String email, String phone, String status, String adminStatus,
                              String vehicleType, String vehicleTypeCode, String vehicleOtherName, String vehicleNumber,
                              String drivingLicense, String identityDocumentType, String city, String pincode,
                              List<String> pincodes, String availabilityPreference, String deliveryExperience,
                              String workingDays, String workingHours, boolean verified) {}

    public record ProfileUpdate(String name, String phone, List<String> pincodes) {}

    private final UserRepository users;
    private final SensitiveDataCipher cipher;

    public DeliveryProfileController(UserRepository users, SensitiveDataCipher cipher) {
        this.users = users;
        this.cipher = cipher;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ProfileView get(Authentication auth) {
        return view(current(auth));
    }

    @PutMapping
    @Transactional
    public ProfileView save(@RequestBody ProfileUpdate in, Authentication auth) {
        User u = current(auth);
        String name = in.name() == null ? "" : in.name().trim().replaceAll("\\s+", " ");
        if (name.length() < 2 || name.length() > 80) throw bad("Name must be 2 to 80 letters.");
        String phone = in.phone() == null ? "" : in.phone().replaceAll("\\s+", "");
        if (!phone.matches("[6-9][0-9]{9}")) throw bad("Mobile number must be a valid 10-digit number.");
        if (!phone.equals(u.getPhone()) && users.existsByPhone(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "This mobile number is already registered.");
        }
        List<String> pins = AuthService.normalisePincodes(in.pincodes() == null ? "" : String.join(",", in.pincodes()));
        u.setName(name);
        u.setPhone(phone);
        u.setServiceablePincodes(String.join(",", pins));
        return view(users.save(u));
    }

    private User current(Authentication auth) {
        return users.findByEmail(auth.getName())
                .filter(x -> x.getRole() == Role.DELIVERY && x.getDeletedAt() == null && x.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Only approved delivery partners have a courier profile."));
    }

    private ProfileView view(User u) {
        List<String> pins = u.getServiceablePincodes() == null || u.getServiceablePincodes().isBlank()
                ? List.of()
                : Arrays.stream(u.getServiceablePincodes().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        return new ProfileView(u.getId(), u.getName(), u.getEmail(), u.getPhone(), u.getStatus().name(),
                u.getStatus() == UserStatus.ACTIVE ? "APPROVED" : u.getStatus().name(),
                dashboardVehicle(u.getVehicleType()), u.getVehicleType(), u.getVehicleOtherName(),
                u.getVehicleNumber() == null ? "" : u.getVehicleNumber(),
                mask(cipher.decrypt(u.getDrivingLicenseNumber())), u.getIdentityDocumentType(),
                u.getCity(), u.getPincode(), pins, u.getAvailabilityPreference(), u.getDeliveryExperience(),
                u.getWorkingDays(), u.getWorkingHours(), true);
    }

    /** The dashboard's vehicle select uses the categories Two-Wheeler / Three-Wheeler / Bicycle. */
    private static String dashboardVehicle(String code) {
        if (code == null) return "Two-Wheeler";
        return switch (code.toUpperCase(Locale.ROOT)) {
            case "BICYCLE" -> "Bicycle";
            case "OTHER" -> "Three-Wheeler";
            default -> "Two-Wheeler";   // MOTORCYCLE, SCOOTER, ELECTRIC_SCOOTER
        };
    }

    private static String mask(String value) {
        if (value == null || value.isBlank()) return "";
        String v = value.replaceAll("\\s+", "");
        return v.length() <= 4 ? "••••" : "••••" + v.substring(v.length() - 4);
    }

    private static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }
}
