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
 * POST /api/auth/login            customers and sellers get a code by email first (two-step login)
 * POST /api/auth/login/verify     second step: the 6-digit code, then the session starts
 * POST /api/auth/forgot-password  sends a reset code
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

    /**
     * Step 1. Wrong password / pending / blocked are refused here, exactly as before.
     * Customers and sellers then get a code by email (the reply is OtpRequired, no session yet).
     * Admin and delivery partners log in directly.
     */
    @PostMapping("/login")
    public Object login(@Valid @RequestBody LoginRequest req,
                        HttpServletRequest request, HttpServletResponse response) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);

        Authentication auth;
        try {
            auth = authManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(email, req.password()));
        } catch (AuthenticationException e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        // password is right: now check role and status (pending / rejected / blocked)
        User user = service.checkMayLogin(email, req.role());

        boolean needsCode = otp.enabled() && (user.getRole() == Role.CUSTOMER || user.getRole() == Role.SELLER);
        if (needsCode) {
            otp.issue(email, OtpPurpose.LOGIN);
            String masked = otp.mask(email);
            return new OtpDtos.OtpRequired(true, email, masked, "We sent a 6-digit code to " + masked + ".");
        }
        return startSession(auth, user, request, response);
    }

    /** Step 2. Only works for someone who passed step 1 and has the code from their email. */
    @PostMapping("/login/verify")
    public UserResponse verify(@Valid @RequestBody OtpDtos.Verify req,
                               HttpServletRequest request, HttpServletResponse response) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);

        User user = service.checkMayLogin(email, req.role());   // still allowed in? right door?
        otp.verify(email, OtpPurpose.LOGIN, req.code());

        UserDetails details = userDetails.loadUserByUsername(email);
        Authentication auth = UsernamePasswordAuthenticationToken.authenticated(details, null, details.getAuthorities());
        return startSession(auth, user, request, response);
    }

    /** Always answers the same way, so nobody can use this to find out which emails are registered. */
    @PostMapping("/forgot-password")
    public Map<String, String> forgot(@Valid @RequestBody OtpDtos.Forgot req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (service.canResetPassword(email)) {
            try {
                otp.issue(email, OtpPurpose.RESET);
            } catch (ApiException e) {
                if (e.getStatus() != HttpStatus.TOO_MANY_REQUESTS) throw e;
                // asked again within 30 seconds: the earlier code is still valid, say nothing different
            }
        }
        Map<String, String> body = new LinkedHashMap<>();
        body.put("message", "If that email is registered, we have sent a 6-digit code to it.");
        return body;
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody OtpDtos.Reset req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (!service.canResetPassword(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired code. Please ask for a new one.");
        }
        otp.verify(email, OtpPurpose.RESET, req.code());
        service.resetPassword(email, req.newPassword());
        Map<String, String> body = new LinkedHashMap<>();
        body.put("message", "Password changed. You can log in now.");
        return body;
    }

    /** The front end calls this on page load to find out who is really logged in. */
    @GetMapping("/me")
    public UserResponse me(Authentication auth) {
        User user = service.findActive(auth.getName());
        if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in.");
        return service.toResponse(user);
    }

    private UserResponse startSession(Authentication auth, User user, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();   // new session id after login (prevents session fixation)
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepo.saveContext(context, request, response);   // creates the session cookie
        return service.toResponse(user);
    }
}