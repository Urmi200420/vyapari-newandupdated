package com.vyapari.config;

import com.vyapari.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first admin on startup (only if there is no admin yet), so you can log in. */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email, password, name;

    public AdminSeeder(UserRepository users, PasswordEncoder encoder,
                       @Value("${vyapari.admin.email}") String email,
                       @Value("${vyapari.admin.password}") String password,
                       @Value("${vyapari.admin.name}") String name) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
        this.name = name;
    }

        @Override
    public void run(String... args) {
        if (!users.existsByRole(Role.ADMIN)) {
            User admin = new User();
            admin.setName(name);
            admin.setEmail(email.trim().toLowerCase());
            admin.setPassword(encoder.encode(password));
            admin.setRole(Role.ADMIN);
            users.save(admin);
            System.out.println("Created first admin: " + admin.getEmail());
        }

        // Demo delivery partner for testing: delivery@vyapari.com / Delivery@123
        if (!users.existsByEmail("delivery@vyapari.com")) {
            User d = new User();
            d.setName("Demo Courier");
            d.setEmail("delivery@vyapari.com");
            d.setPassword(encoder.encode("Delivery@123"));
            d.setRole(Role.DELIVERY);
            users.save(d);
            System.out.println("Created demo delivery partner");
        }
    }stem.out.println(">>> First admin created: " + email + "  (change the password!)");
}
