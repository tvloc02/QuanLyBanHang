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
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;

    private final JwtService jwtService;

    private final GoogleAuthService googleAuthService;

    public AuthService(UserRepository userRepository, JwtService jwtService, GoogleAuthService googleAuthService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.googleAuthService = googleAuthService;
    }

    public String login(LoginRequest request) {
        return "OK";
    }

    public String register(RegisterRequest request) {
        return "OK";
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
        return new AuthTokenResponse(user.getId(), token);
    }
}
