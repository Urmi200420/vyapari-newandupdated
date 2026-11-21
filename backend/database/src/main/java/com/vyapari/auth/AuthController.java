package com.vyapari.controller;

import com.vyapari.model.Role;
import com.vyapari.model.User;
import com.vyapari.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record RegisterRequest(
            @NotBlank(message = "Name is required") String name,
            @NotBlank @Email(message = "Enter a valid email") String email,
            @NotBlank @Size(min = 8, max = 72, message = "Password must be at least 8 characters") String password,
            Role role,
            String phone,
            String shopName,
            String city) {}

    private final AuthenticationManager authManager;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SecurityContextRepository contextRepo;

    public AuthController(AuthenticationManager authManager, UserRepository users,
                          PasswordEncoder encoder, SecurityContextRepository contextRepo) {
        this.authManager = authManager;
        this.users = users;
        this.encoder = encoder;
        this.contextRepo = contextRepo;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already registered"));
        }
        // Public sign-up creates buyers and sellers only (admins and delivery partners are created by staff)
        Role role = (req.role() == Role.SELLER) ? Role.SELLER : Role.BUYER;

        if (role == Role.SELLER && (req.shopName() == null || req.shopName().isBlank())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Shop name is required for sellers"));
        }

        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPassword(encoder.encode(req.password()));
        u.setRole(role);
        u.setPhone(req.phone());
        if (role == Role.SELLER) {
            u.setShopName(req.shopName().trim());
            u.setCity(req.city());
        }
        u.setApproved(role != Role.SELLER);   // sellers wait for the admin
        users.save(u);
        return ResponseEntity.status(HttpStatus.CREATED).body(toDto(u));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req,
                                   HttpServletRequest request, HttpServletResponse response) {
        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password()));

            User u = users.findByEmail(auth.getName()).orElseThrow();
            if (Boolean.FALSE.equals(u.getApproved())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Your shop is still waiting for admin approval."));
            }

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            contextRepo.saveContext(context, request, response);   // creates the session cookie

            return ResponseEntity.ok(toDto(u));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or password"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        return users.findByEmail(auth.getName())
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(toDto(u)))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    private Map<String, Object> toDto(User u) {
        return Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail(), "role", u.getRole().name());
    }
}