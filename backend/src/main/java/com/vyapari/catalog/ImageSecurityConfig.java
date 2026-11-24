package com.vyapari.catalog;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Makes product pictures public without touching SecurityConfig.
 * This rule is checked first and only applies to /api/images/**. Everything else keeps its old rules.
 */
@Configuration
public class ImageSecurityConfig {

    @Bean
    @Order(1)
    SecurityFilterChain imageChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/api/images/**")
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a.anyRequest().permitAll());
        return http.build();
    }
}
