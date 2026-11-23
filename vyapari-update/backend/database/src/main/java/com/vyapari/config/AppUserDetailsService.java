package com.vyapari.config;

import com.vyapari.user.User;
import com.vyapari.user.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/** Tells Spring Security how to find a person by email. */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository users;

    public AppUserDetailsService(UserRepository users) {
        this.users = users;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User u = users.findByEmail(email.toLowerCase())
                .filter(x -> x.getDeletedAt() == null)   // soft-deleted admins cannot log in
                .orElseThrow(() -> new UsernameNotFoundException("No such user"));
        // "ROLE_ADMIN" lets other controllers use @PreAuthorize("hasRole('ADMIN')")
        return new org.springframework.security.core.userdetails.User(
                u.getEmail(), u.getPasswordHash(), List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name())));
    }
}