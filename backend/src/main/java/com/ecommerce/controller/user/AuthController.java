 package com.ecommerce.controller.user;

import com.ecommerce.dto.request.GoogleLoginRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.AuthTokenResponse;
import com.ecommerce.service.user.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<String> login() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/register")
    public ResponseEntity<String> register() {
        return ResponseEntity.ok("OK");
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthTokenResponse>> google(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.googleLogin(request)));
    }
}
