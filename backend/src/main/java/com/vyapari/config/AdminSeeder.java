package com.vyapari.config;

import com.vyapari.user.Role;
import com.vyapari.user.User;
import com.vyapari.user.UserRepository;
import com.vyapari.user.UserStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Creates the first admin on startup (only if there is no admin yet), so you can log in. */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email, password, name;
    private final boolean demoDelivery;

    public AdminSeeder(UserRepository users, PasswordEncoder encoder,
                       @Value("${vyapari.admin.email}") String email,
                       @Value("${vyapari.admin.password}") String password,
                       @Value("${vyapari.admin.name}") String name,
                       @Value("${vyapari.seed.demo-delivery:false}") boolean demoDelivery) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
        this.name = name;
        this.demoDelivery = demoDelivery;
    }

    @Override
    public void run(String... args) {
        if (!users.existsByRole(Role.ADMIN)) {
            users.save(make(name, email, password, Role.ADMIN));
            System.out.println(">>> First admin created: " + email.trim().toLowerCase(Locale.ROOT) + "  (change the password!)");
        }

        // Demo courier for testing only (switch off with vyapari.seed.demo-delivery=false)
        if (demoDelivery && !users.existsByEmail("delivery@vyapari.com")) {
            users.save(make("Demo Courier", "delivery@vyapari.com", "Delivery@123", Role.DELIVERY));
            System.out.println(">>> Demo delivery partner created: delivery@vyapari.com");
        }
    }

    private User make(String name, String email, String rawPassword, Role role) {
        User u = new User();
        u.setName(name);
        u.setEmail(email.trim().toLowerCase(Locale.ROOT));
        u.setPasswordHash(encoder.encode(rawPassword));
        u.setRole(role);
        u.setStatus(UserStatus.ACTIVE);
        return u;
    }
}
