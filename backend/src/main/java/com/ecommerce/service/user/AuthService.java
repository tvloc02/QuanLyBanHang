package com.ecommerce.service.user;

import com.ecommerce.dto.request.GoogleLoginRequest;
import com.ecommerce.dto.request.LoginRequest;
import com.ecommerce.dto.request.RegisterRequest;
import com.ecommerce.dto.response.AuthTokenResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.security.JwtService;
import java.time.Instant;
import java.util.Set;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AuthService {

    private final UserRepository userRepository;

    private final JwtService jwtService;

    private final GoogleAuthService googleAuthService;

    private final PasswordEncoder passwordEncoder;

    public AuthService(
        UserRepository userRepository,
        JwtService jwtService,
        GoogleAuthService googleAuthService,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.googleAuthService = googleAuthService;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthTokenResponse login(LoginRequest request) {
        String input = request.getUsernameOrEmail();
        Optional<User> byUsername = userRepository.findByUsername(input);
        User user = byUsername.orElseGet(() -> userRepository.findByEmail(input).orElseGet(() -> userRepository.findByPhone(input).orElse(null)));

        if (user == null) {
            throw new BadRequestException("Invalid credentials");
        }
        if (Boolean.FALSE.equals(user.getEnabled())) {
            throw new BadRequestException("User is disabled");
        }
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BadRequestException("Invalid credentials");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid credentials");
        }

        String token = jwtService.generateToken(String.valueOf(user.getId()));
        Set<String> roles = user.getRoles() == null
            ? Set.of()
            : user.getRoles().stream().filter(r -> r != null).map(Enum::name).collect(Collectors.toSet());
        return new AuthTokenResponse(user.getId(), token, roles);
    }

    public AuthTokenResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new BadRequestException("Email already exists");
        }
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            throw new BadRequestException("Username already exists");
        }

        Instant now = Instant.now();
        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.getRoles().add(UserRole.CUSTOMER);
        user.setEnabled(true);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        user = userRepository.save(user);

        String token = jwtService.generateToken(String.valueOf(user.getId()));
        Set<String> roles = user.getRoles() == null
            ? Set.of()
            : user.getRoles().stream().filter(r -> r != null).map(Enum::name).collect(Collectors.toSet());
        return new AuthTokenResponse(user.getId(), token, roles);
    }

    public AuthTokenResponse googleLogin(GoogleLoginRequest request) {
        GoogleAuthService.GoogleTokenInfo info = googleAuthService.verifyIdToken(request.getCredential());

        Optional<User> byProvider = userRepository.findByOauthProviderAndOauthProviderId("google", info.sub());
        User user = byProvider.orElseGet(() -> userRepository.findByEmail(info.email()).orElse(null));

        Instant now = Instant.now();
        if (user == null) {
            user = new User();
            user.setEmail(info.email());
            user.setFullName(info.name());
            user.setOauthProvider("google");
            user.setOauthProviderId(info.sub());
            user.getRoles().add(UserRole.CUSTOMER);
            user.setEnabled(true);
            user.setCreatedAt(now);
            user.setUpdatedAt(now);
            user = userRepository.save(user);
        } else {
            boolean changed = false;

            if (user.getOauthProvider() == null || user.getOauthProvider().isBlank()) {
                user.setOauthProvider("google");
                user.setOauthProviderId(info.sub());
                changed = true;
            }

            if (user.getFullName() == null || user.getFullName().isBlank()) {
                user.setFullName(info.name());
                changed = true;
            }

            if (user.getRoles() == null || user.getRoles().isEmpty()) {
                user.getRoles().add(UserRole.CUSTOMER);
                changed = true;
            }

            if (Boolean.FALSE.equals(user.getEnabled())) {
                throw new BadRequestException("User is disabled");
            }

            if (changed) {
                user.setUpdatedAt(now);
                user = userRepository.save(user);
            }
        }

        String token = jwtService.generateToken(String.valueOf(user.getId()));
        Set<String> roles = user.getRoles() == null
            ? Set.of()
            : user.getRoles().stream().filter(r -> r != null).map(Enum::name).collect(Collectors.toSet());
        return new AuthTokenResponse(user.getId(), token, roles);
    }
}
