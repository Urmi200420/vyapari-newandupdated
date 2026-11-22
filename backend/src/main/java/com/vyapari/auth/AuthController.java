package com.vyapari.auth;

import com.vyapari.config.AppUserDetailsService;
import com.vyapari.otp.OtpPurpose;
import com.vyapari.otp.OtpService;
import com.vyapari.user.Role;
import com.vyapari.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * POST /api/auth/register
 * POST /api/auth/login            customers and sellers get a code by email, admin and delivery log in at once
 * POST /api/auth/login/verify     step 2: the code from the email
 * POST /api/auth/forgot-password  emails a reset code
 * POST /api/auth/reset-password   code + new password
 * GET  /api/auth/me
 * (Logout is handled in SecurityConfig.)
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepo;
    private final AuthService service;
    private final OtpService otp;
    private final AppUserDetailsService userDetails;

    public AuthController(AuthenticationManager authManager, SecurityContextRepository contextRepo,
                          AuthService service, OtpService otp, AppUserDetailsService userDetails) {
        this.authManager = authManager;
        this.contextRepo = contextRepo;
        this.service = service;
        this.otp = otp;
        this.userDetails = userDetails;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest req) {
        return service.register(req);
    }

    /** Step 1. Wrong password stops here. Right password: either a code is emailed, or the person is in. */
    @PostMapping("/login")
    public Object login(@Valid @RequestBody LoginRequest req,
                        HttpServletRequest request, HttpServletResponse response) {
        String email = clean(req.email());

        Authentication auth;
        try {
            auth = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, req.password()));
        } catch (AuthenticationException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        // password is right: now check role and status (pending / rejected / blocked)
        User user = service.checkMayLogin(email, req.role());

        if (needsCode(user)) {
            otp.issue(email, OtpPurpose.LOGIN);
            String masked = otp.mask(email);
            return new OtpChallengeResponse(true, email, masked,
                    "We emailed a 6-digit code to " + masked + ". Enter it to finish logging in.");
        }

        startSession(auth, request, response);
        return service.toResponse(user);
    }

    /** Step 2. A code only exists after the password was right in step 1, so this cannot skip the password. */
    @PostMapping("/login/verify")
    public UserResponse verifyLogin(@Valid @RequestBody VerifyOtpRequest req,
                                    HttpServletRequest request, HttpServletResponse response) {
        String email = clean(req.email());

        User user = service.checkMayLogin(email, req.role());
        otp.verify(email, OtpPurpose.LOGIN, req.code());

        UserDetails details = userDetails.loadUserByUsername(email);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(details, null, details.getAuthorities());
        startSession(auth, request, response);

        return service.toResponse(user);
    }

    /** Always answers the same way, so nobody can use this to find out who has an account. */
    @PostMapping("/forgot-password")
    public Map<String, Object> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        String email = clean(req.email());

        if (service.accountExists(email)) {
            try {
                otp.issue(email, OtpPurpose.RESET);
            } catch (ApiException e) {
                // "wait 30 seconds" would reveal that the account exists, so it is not shown here
                if (e.getStatus() != HttpStatus.TOO_MANY_REQUESTS) throw e;
            }
        }

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("message", "If this email is registered, we have sent a 6-digit code to it.");
        m.put("email", email);
        m.put("maskedEmail", otp.mask(email));
        return m;
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        String email = clean(req.email());
        otp.verify(email, OtpPurpose.RESET, req.code());
        service.resetPassword(email, req.newPassword());
        return Map.of("message", "Your password was changed. You can log in now.");
    }

    /** The front end calls this on page load to find out who is really logged in. */
    @GetMapping("/me")
    public UserResponse me(Authentication auth) {
        User user = service.findActive(auth.getName());
        if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in.");
        return service.toResponse(user);
    }

    // ---- helpers ----

    private static String clean(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /** Customers and sellers confirm with a code. Admin and delivery partners do not. */
    private boolean needsCode(User user) {
        return otp.enabled() && (user.getRole() == Role.CUSTOMER || user.getRole() == Role.SELLER);
    }

    private void startSession(Authentication auth, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();   // new session id after login (prevents session fixation)
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepo.saveContext(context, request, response);   // creates the session cookie
    }
}
