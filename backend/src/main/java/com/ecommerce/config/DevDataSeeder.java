package com.ecommerce.config;

import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.UserRepository;
import java.time.Instant;
import java.util.HashSet;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

@Profile("dev")
@Configuration
public class DevDataSeeder {

    @Bean
    public CommandLineRunner seedAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            Instant now = Instant.now();

            User admin = userRepository.findByUsername("admin").orElseGet(User::new);
            admin.setUsername("admin");
            if (admin.getEmail() == null || admin.getEmail().isBlank()) {
                admin.setEmail("admin@fashionhub.local");
            }
            if (admin.getFullName() == null || admin.getFullName().isBlank()) {
                admin.setFullName("Admin");
            }

            admin.setPassword(passwordEncoder.encode("123456"));
            HashSet<UserRole> roles = new HashSet<>();
            roles.add(UserRole.ADMIN);
            admin.setRoles(roles);
            admin.setEnabled(true);

            if (admin.getCreatedAt() == null) {
                admin.setCreatedAt(now);
            }
            admin.setUpdatedAt(now);

            userRepository.save(admin);
        };
    }
}
