package com.vyapari.auth;

import com.vyapari.otp.OtpService;
import com.vyapari.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository users;
    private final SellerProfileRepository sellers;
    private final PasswordEncoder encoder;
    private final SensitiveDataCipher cipher;
    private final OtpService otp;
    private final boolean requireEmailOtp;
    private final boolean requireCustomerEmailOtp;

    public AuthService(UserRepository users, SellerProfileRepository sellers, PasswordEncoder encoder, SensitiveDataCipher cipher,
                       OtpService otp,
                       @Value("${vyapari.otp.require-for-delivery-registration:true}") boolean requireEmailOtp,
                       @Value("${vyapari.otp.require-for-customer-registration:true}") boolean requireCustomerEmailOtp) {
        this.users = users;
        this.sellers = sellers;
        this.encoder = encoder;
        this.cipher = cipher;
        this.otp = otp;
        this.requireEmailOtp = requireEmailOtp;
        this.requireCustomerEmailOtp = requireCustomerEmailOtp;
    }

    /** Sign-up for customers and sellers (JSON). Delivery partners must use the multipart application form. */
    @Transactional
    public UserResponse register(RegisterRequest req) {
        Role role = parseRole(req.role());
        if (role != Role.CUSTOMER && role != Role.SELLER) {
            // Delivery applications need private document uploads: POST /api/auth/register/delivery (multipart).
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only customers and sellers can sign up here.");
        }
        if (role == Role.SELLER && (req.shopName() == null || req.shopName().trim().length() < 2)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter your shop name.");
        }

        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "This email is already registered. Try logging in.");
        }

        // customers prove they own the mailbox with the e-mailed 6-digit code (redeemed in this transaction)
        if (role == Role.CUSTOMER && requireCustomerEmailOtp) {
            otp.consume(email, OtpService.CUSTOMER_REGISTRATION, req.emailVerificationToken());
        }

        User user = new User();
        user.setName(req.name().trim().replaceAll("\\s+", " "));
        user.setEmail(email);
        user.setPhone(req.phone());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setRole(role);
        // Customers start active; sellers wait for admin approval.
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

    /**
     * Saves a delivery-partner application with status PENDING. Call {@link #validateDeliveryApplication}
     * and {@link #assertDeliveryContactAvailable} first, then store the documents and pass their private keys here.
     */
    @Transactional
    public UserResponse registerDelivery(RegisterRequest req, String identityKey, String licenceKey, String rcKey,
                                         String emailVerificationToken) {
        validateDeliveryApplication(req, identityKey != null, licenceKey != null, rcKey != null);
        assertDeliveryContactAvailable(req.email(), req.phone());
        // the applicant proved they own this mailbox (6-digit code); the token is redeemed in this same transaction
        if (requireEmailOtp) otp.consume(req.email(), OtpService.DELIVERY_REGISTRATION, emailVerificationToken);

        boolean bicycle = "BICYCLE".equalsIgnoreCase(req.vehicleType().trim());
        User user = new User();
        user.setName(req.name().trim().replaceAll("\\s+", " "));
        user.setEmail(req.email().trim().toLowerCase(Locale.ROOT));
        user.setPhone(req.phone().trim());
        user.setPasswordHash(encoder.encode(req.password()));
        user.setRole(Role.DELIVERY);
        user.setStatus(UserStatus.PENDING);   // cannot log in until an admin approves
        user.setDateOfBirth(req.dateOfBirth());
        user.setAddress(req.address().trim().replaceAll("\\s+", " "));
        user.setCity(req.city().trim());
        user.setPincode(req.pincode().trim());
        user.setEmergencyContact(req.emergencyContact().trim());
        user.setIdentityDocumentType(req.identityDocumentType().trim().toUpperCase(Locale.ROOT));
        user.setIdentityDocumentName("OTHER".equalsIgnoreCase(req.identityDocumentType().trim()) ? clean(req.identityDocumentName()) : null);
        user.setIdentityDocumentNumber(cipher.encrypt(req.identityDocumentNumber().trim().toUpperCase(Locale.ROOT)));
        user.setIdentityDocumentPath(identityKey);
        user.setVehicleType(req.vehicleType().trim().toUpperCase(Locale.ROOT));
        user.setVehicleOtherName("OTHER".equalsIgnoreCase(req.vehicleType().trim()) ? clean(req.vehicleOtherName()) : null);
        user.setVehicleNumber(bicycle ? null : req.vehicleNumber().trim().toUpperCase(Locale.ROOT));
        user.setDrivingLicenseNumber(bicycle ? null : cipher.encrypt(req.drivingLicenseNumber().trim().toUpperCase(Locale.ROOT)));
        user.setDrivingLicensePath(bicycle ? null : licenceKey);
        user.setVehicleRcPath(bicycle ? null : rcKey);
        user.setServiceablePincodes(String.join(",", normalisePincodes(req.serviceablePincodes())));
        user.setAvailabilityPreference(req.availabilityPreference().trim().toUpperCase(Locale.ROOT));
        user.setDeliveryExperience(req.deliveryExperience().trim().toUpperCase(Locale.ROOT));
        user.setWorkingDays(String.join(",", normaliseDays(req.workingDays())));
        user.setWorkingHours(req.workingHours().trim().toUpperCase(Locale.ROOT));
        users.save(user);
        return UserResponse.of(user, null);
    }

    /** Duplicate email / mobile check for delivery applications (also used by the wizard's first step). */
    public void assertDeliveryContactAvailable(String rawEmail, String rawPhone) {
        if (rawEmail != null && !rawEmail.isBlank() && users.existsByEmail(rawEmail.trim().toLowerCase(Locale.ROOT))) {
            throw new ApiException(HttpStatus.CONFLICT, "This email is already registered. Try logging in.");
        }
        if (rawPhone != null && !rawPhone.isBlank() && users.existsByPhone(rawPhone.trim())) {
            throw new ApiException(HttpStatus.CONFLICT, "This mobile number is already registered.");
        }
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
                    "Your " + user.getRole().name().toLowerCase(Locale.ROOT) + " application is waiting for admin approval.");
            case REJECTED -> throw new ApiException(HttpStatus.FORBIDDEN,
                    user.getRejectionReason() == null ? "Your application was not approved." : "Your application was not approved: " + user.getRejectionReason());
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
    private static final Set<String> ID_TYPES = Set.of("AADHAAR", "VOTER_ID", "DRIVING_LICENCE", "PASSPORT", "OTHER");
    private static final Set<String> VEHICLE_TYPES = Set.of("MOTORCYCLE", "SCOOTER", "BICYCLE", "ELECTRIC_SCOOTER", "OTHER");
    private static final Set<String> AVAILABILITY = Set.of("FULL_TIME", "PART_TIME", "FLEXIBLE");
    private static final Set<String> EXPERIENCE = Set.of("FRESHER", "UNDER_1_YEAR", "1_TO_3_YEARS", "3_TO_5_YEARS", "OVER_5_YEARS");
    private static final Set<String> HOURS = Set.of("MORNING", "AFTERNOON", "EVENING", "FLEXIBLE");
    private static final List<String> DAYS = List.of("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

    /**
     * Server-side checks for the four-step delivery wizard. Runs before any document is written to disk.
     * The has* flags say which supporting documents were uploaded.
     */
    public void validateDeliveryApplication(RegisterRequest req, boolean hasIdentity, boolean hasLicence, boolean hasRc) {
        if (req.dateOfBirth() == null || blank(req.address()) || blank(req.city()) || blank(req.pincode())
                || blank(req.emergencyContact()) || blank(req.identityDocumentType()) || blank(req.identityDocumentNumber())
                || blank(req.vehicleType()) || blank(req.availabilityPreference()) || blank(req.deliveryExperience())
                || blank(req.workingDays()) || blank(req.workingHours()) || blank(req.serviceablePincodes())) {
            throw bad("Please complete all required delivery partner details.");
        }
        int age = Period.between(req.dateOfBirth(), LocalDate.now()).getYears();
        if (req.dateOfBirth().isAfter(LocalDate.now()) || age < 18) throw bad("Delivery partners must be at least 18 years old.");
        if (age > 75) throw bad("Please check your date of birth.");
        if (req.address().trim().length() > 250) throw bad("Residential address is too long (maximum 250 characters).");
        if (!req.pincode().trim().matches("[1-9][0-9]{5}")) throw bad("Enter a valid 6-digit PIN code.");
        if (!req.emergencyContact().trim().matches("[6-9][0-9]{9}")) throw bad("Enter a valid 10-digit emergency contact number.");
        if (req.emergencyContact().trim().equals(req.phone().trim())) throw bad("Emergency contact must be different from your own mobile number.");

        String idType = req.identityDocumentType().trim().toUpperCase(Locale.ROOT);
        if (!ID_TYPES.contains(idType)) throw bad("Please choose a valid government ID type.");
        if ("OTHER".equals(idType) && (blank(req.identityDocumentName()) || req.identityDocumentName().trim().length() > 80)) {
            throw bad("Please specify the government ID type.");
        }
        String idNumber = req.identityDocumentNumber().trim();
        // 40 characters keeps the AES-GCM ciphertext inside the existing identity_document_number column (100).
        if (!idNumber.matches("[A-Za-z0-9 /-]{4,40}")) throw bad("Enter a valid government identity number (4–40 letters or digits).");
        if (!hasIdentity) throw bad("Please upload or capture your government identity document.");

        String vehicle = req.vehicleType().trim().toUpperCase(Locale.ROOT);
        if (!VEHICLE_TYPES.contains(vehicle)) throw bad("Please choose a valid vehicle type.");
        if ("OTHER".equals(vehicle) && (blank(req.vehicleOtherName()) || req.vehicleOtherName().trim().length() > 50)) {
            throw bad("Please specify your vehicle type.");
        }
        if (!"BICYCLE".equals(vehicle)) {
            if (blank(req.vehicleNumber()) || !req.vehicleNumber().trim().matches("[A-Za-z0-9 -]{4,20}")) {
                throw bad("Enter a valid vehicle registration number.");
            }
            if (blank(req.drivingLicenseNumber()) || !req.drivingLicenseNumber().trim().matches("[A-Za-z0-9 /-]{5,30}")) {
                throw bad("Enter a valid driving licence number.");
            }
            if (!hasLicence || !hasRc) throw bad("Driving licence and vehicle RC documents are required for this vehicle type.");
        }

        if (!AVAILABILITY.contains(req.availabilityPreference().trim().toUpperCase(Locale.ROOT))) throw bad("Please choose your availability.");
        if (!EXPERIENCE.contains(req.deliveryExperience().trim().toUpperCase(Locale.ROOT))) throw bad("Please choose your delivery experience.");
        if (!HOURS.contains(req.workingHours().trim().toUpperCase(Locale.ROOT))) throw bad("Please choose your preferred working hours.");
        normaliseDays(req.workingDays());
        normalisePincodes(req.serviceablePincodes());
    }

    /** "700001, 700002" -> [700001, 700002]; 1 to 20 unique six-digit PIN codes. */
    public static List<String> normalisePincodes(String raw) {
        List<String> pins = new ArrayList<>();
        for (String p : (raw == null ? "" : raw).split("[,\\s]+")) {
            if (p.isBlank()) continue;
            if (!p.matches("[1-9][0-9]{5}")) throw bad("Serviceable PIN codes must be 6-digit numbers separated by commas.");
            if (!pins.contains(p)) pins.add(p);
        }
        if (pins.isEmpty()) throw bad("Add at least one serviceable PIN code.");
        if (pins.size() > 20) throw bad("You can add up to 20 serviceable PIN codes.");
        return pins;
    }

    private static List<String> normaliseDays(String raw) {
        List<String> days = new ArrayList<>();
        for (String d : (raw == null ? "" : raw).split(",")) {
            String t = d.trim();
            if (t.isEmpty()) continue;
            String match = DAYS.stream().filter(x -> x.equalsIgnoreCase(t)).findFirst()
                    .orElseThrow(() -> bad("Please choose valid working days."));
            if (!days.contains(match)) days.add(match);
        }
        if (days.isEmpty()) throw bad("Choose at least one working day.");
        return days;
    }

    private Role parseRole(String raw) {
        try {
            return Role.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose customer, seller, or delivery.");
        }
    }

    private static ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }

    private boolean blank(String value) { return value == null || value.isBlank(); }
    private String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
