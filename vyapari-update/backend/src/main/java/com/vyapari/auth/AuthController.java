package com.vyapari.auth;

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
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

/** POST /api/auth/register, POST /api/auth/login, GET /api/auth/me. (Logout is handled in SecurityConfig.) */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final SecurityContextRepository contextRepo;
    private final AuthService service;

    public AuthController(AuthenticationManager authManager, SecurityContextRepository contextRepo, AuthService service) {
        this.authManager = authManager;
        this.contextRepo = contextRepo;
        this.service = service;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest req) {
        return service.register(req);
    }

    @PostMapping("/login")
    public UserResponse login(@Valid @RequestBody LoginRequest req,
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

        if (request.getSession(false) != null) {
            request.changeSessionId();   // new session id after login (prevents session fixation)
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepo.saveContext(context, request, response);   // creates the session cookie

        return service.toResponse(user);
    }

    /** The front end calls this on page load to find out who is really logged in. */
    @GetMapping("/me")
    public UserResponse me(Authentication auth) {
        User user = service.findActive(auth.getName());
        if (user == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "Please log in.");
        return service.toResponse(user);
    }
}
