package com.ecommerce.config;

import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.UserRepository;
import java.time.Instant;
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
            if (userRepository.findByUsername("admin").isPresent()) {
                return;
            }

            Instant now = Instant.now();

            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@fashionhub.local");
            admin.setFullName("Admin");
            admin.setPassword(passwordEncoder.encode("123456"));
            admin.getRoles().add(UserRole.ADMIN);
            admin.setEnabled(true);
            admin.setCreatedAt(now);
            admin.setUpdatedAt(now);

            userRepository.save(admin);
        };
    }
}
