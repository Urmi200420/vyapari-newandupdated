package com.vyapari.delivery;

import com.vyapari.auth.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 *   POST /api/auth/register/delivery         multipart: JSON part "application" + files "identity", "licence", "vehicleRc"
 *                                            + text field "emailVerificationToken" (from POST /api/auth/otp/verify)
 *   POST /api/auth/register/delivery/check   JSON { email, phone } -> 200, or 409 when either is already registered
 *
 * Order matters: every field is validated and duplicates are rejected BEFORE any document touches the disk,
 * and stored documents are removed again if saving the application fails.
 */
@RestController
@RequestMapping("/api/auth/register/delivery")
public class DeliveryRegistrationController {

    public record ContactCheck(String email, String phone) {}

    private final AuthService auth;
    private final PrivateDocumentStorage storage;

    public DeliveryRegistrationController(AuthService auth, PrivateDocumentStorage storage) {
        this.auth = auth;
        this.storage = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestPart("application") RegisterRequest r,
                                 @RequestPart(value = "identity", required = false) MultipartFile identity,
                                 @RequestPart(value = "licence", required = false) MultipartFile licence,
                                 @RequestPart(value = "vehicleRc", required = false) MultipartFile vehicleRc,
                                 @RequestParam(value = "emailVerificationToken", required = false) String emailVerificationToken) {
        boolean hasIdentity = present(identity);
        boolean bicycle = r.vehicleType() != null && "BICYCLE".equalsIgnoreCase(r.vehicleType().trim());
        boolean hasLicence = !bicycle && present(licence);
        boolean hasRc = !bicycle && present(vehicleRc);

        // 1. reject bad or duplicate applications before writing anything
        auth.validateDeliveryApplication(r, hasIdentity, hasLicence, hasRc);
        auth.assertDeliveryContactAvailable(r.email(), r.phone());
        storage.check(identity);
        if (hasLicence) storage.check(licence);
        if (hasRc) storage.check(vehicleRc);

        // 2. store privately, 3. save; on any failure remove what was stored
        List<String> stored = new ArrayList<>();
        try {
            String identityKey = keep(stored, storage.store(identity));
            String licenceKey = hasLicence ? keep(stored, storage.store(licence)) : null;
            String rcKey = hasRc ? keep(stored, storage.store(vehicleRc)) : null;
            return auth.registerDelivery(r, identityKey, licenceKey, rcKey, emailVerificationToken);
        } catch (RuntimeException e) {
            stored.forEach(storage::delete);
            throw e;
        }
    }

    /** Lets the wizard report a duplicate email or mobile on step 1 instead of after all four steps. */
    @PostMapping(value = "/check", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Boolean> check(@RequestBody ContactCheck body) {
        auth.assertDeliveryContactAvailable(body.email(), body.phone());
        return Map.of("available", true);
    }

    private static boolean present(MultipartFile f) { return f != null && !f.isEmpty(); }

    private static String keep(List<String> stored, String key) {
        stored.add(key);
        return key;
    }
}
