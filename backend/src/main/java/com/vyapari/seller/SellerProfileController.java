package com.vyapari.seller;

import com.vyapari.auth.ApiException;
import com.vyapari.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

/**
 *   GET /api/seller/profile   the logged-in seller's shop details (from registration, plus anything they saved)
 *   PUT /api/seller/profile   save owner, shop, GSTIN, pickup address and bank details
 * The field names are exactly the ones the Shop profile page uses.
 * The email is the login, so it is shown but never changed here.
 * Each seller can only read and change their own profile (it is looked up from the login, never from a URL).
 */
@RestController
@RequestMapping("/api/seller/profile")
public class SellerProfileController {

    public record Pickup(String contactPerson, String contactPhone, String houseNumber, String streetAddress,
                         String landmark, String city, String state, String pincode, String hours) {}

    public record Bank(String bankName, String accountNumber, String ifscCode) {}

    public record ProfileDto(String ownerName, String shopName, String phone, String email, String description,
                             String gstin, Pickup pickup, Bank bank) {}

    private final UserRepository users;
    private final SellerProfileRepository profiles;

    public SellerProfileController(UserRepository users, SellerProfileRepository profiles) {
        this.users = users;
        this.profiles = profiles;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ProfileDto get(Authentication auth) {
        User u = currentSeller(auth);
        return toDto(u, profileOf(u));
    }

    @PutMapping
    @Transactional
    public ProfileDto save(@RequestBody ProfileDto in, Authentication auth) {
        User u = currentSeller(auth);
        SellerProfile p = profileOf(u);
        Pickup k = in.pickup() == null ? new Pickup(null, null, null, null, null, null, null, null, null) : in.pickup();
        Bank b = in.bank() == null ? new Bank(null, null, null) : in.bank();

        String owner = text(in.ownerName(), 60, "Owner name");
        String shop = text(in.shopName(), 80, "Shop name");
        String phone = text(in.phone(), 15, "Phone");
        String contactPhone = text(k.contactPhone(), 15, "Pickup contact phone");
        String pincode = text(k.pincode(), 10, "Pincode");
        String gstin = text(in.gstin(), 15, "GSTIN").toUpperCase(Locale.ROOT);
        String bankName = text(b.bankName(), 80, "Bank name");
        String account = text(b.accountNumber(), 20, "Account number").replaceAll("\\s", "");
        String ifsc = text(b.ifscCode(), 11, "IFSC code").toUpperCase(Locale.ROOT);

        if (shop.length() < 2) throw bad("Please enter your shop name.");
        if (!phone.matches("[6-9][0-9]{9}")) throw bad("Enter a valid 10-digit shop phone number.");
        if (!contactPhone.isEmpty() && !contactPhone.matches("[0-9]{10}")) throw bad("Pickup contact phone must be 10 digits.");
        if (!pincode.isEmpty() && !pincode.matches("[0-9]{6}")) throw bad("Pincode must be 6 digits.");
        if (!gstin.isEmpty() && !gstin.matches("[0-9A-Z]{15}")) throw bad("GSTIN must be 15 letters and digits.");
        if (!account.isEmpty() && !account.matches("[0-9]{8,20}")) throw bad("Bank account number must be 8 to 20 digits.");
        if (!ifsc.isEmpty() && !ifsc.matches("[A-Z]{4}0[A-Z0-9]{6}")) throw bad("IFSC code looks wrong (example: SBIN0001234).");

        u.setPhone(phone);
        users.save(u);

        p.setOwnerName(owner);
        p.setShopName(shop);
        p.setDescription(text(in.description(), 400, "Description"));
        p.setGstin(gstin);
        p.setBankName(bankName);
        p.setBankAccountNumber(account);
        p.setBankIfsc(ifsc);
        p.setContactPerson(text(k.contactPerson(), 80, "Contact person"));
        p.setContactPhone(contactPhone);
        p.setLine1(text(k.streetAddress(), 150, "Street address"));   // street  -> pickup_line1
        p.setLine2(text(k.houseNumber(), 150, "House or unit number")); // house   -> pickup_line2
        p.setLandmark(text(k.landmark(), 100, "Landmark"));
        p.setCity(text(k.city(), 60, "City"));
        p.setState(text(k.state(), 60, "State"));
        p.setPincode(pincode);
        p.setHours(text(k.hours(), 100, "Pickup hours"));
        profiles.save(p);

        return toDto(u, p);
    }

    private User currentSeller(Authentication auth) {
        return users.findByEmail(auth.getName())
                .filter(x -> x.getRole() == Role.SELLER && x.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Only sellers have a shop profile."));
    }

    private SellerProfile profileOf(User u) {
        return profiles.findByUserId(u.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Shop profile not found."));
    }

    /** What the page shows. Anything not saved yet starts from the registration details. */
    private ProfileDto toDto(User u, SellerProfile p) {
        Pickup k = new Pickup(
                or(p.getContactPerson(), u.getName()),
                or(p.getContactPhone(), u.getPhone()),
                or(p.getLine2(), ""),
                or(p.getLine1(), ""),
                or(p.getLandmark(), ""),
                or(p.getCity(), ""),
                or(p.getState(), ""),
                or(p.getPincode(), ""),
                or(p.getHours(), ""));
        Bank b = new Bank(or(p.getBankName(), ""), or(p.getBankAccountNumber(), ""), or(p.getBankIfsc(), ""));
        return new ProfileDto(or(p.getOwnerName(), u.getName()), p.getShopName(), or(u.getPhone(), ""), u.getEmail(),
                or(p.getDescription(), ""), or(p.getGstin(), ""), k, b);
    }

    private static String or(String value, String fallback) {
        return value == null || value.isBlank() ? (fallback == null ? "" : fallback) : value;
    }

    private static String text(String value, int max, String label) {
        String t = value == null ? "" : value.trim();
        if (t.length() > max) throw bad(label + " is too long (maximum " + max + " characters).");
        return t;
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }
}
