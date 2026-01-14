package com.ecommerce.service.user;

import com.ecommerce.exception.BadRequestException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class GoogleAuthService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${google.client-id:}")
    private String googleClientId;

    public GoogleTokenInfo verifyIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadRequestException("Missing Google credential");
        }
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new BadRequestException("Google clientId is not configured");
        }

        String url = UriComponentsBuilder
            .fromHttpUrl("https://oauth2.googleapis.com/tokeninfo")
            .queryParam("id_token", idToken)
            .toUriString();

        Map<?, ?> res;
        try {
            res = restTemplate.getForObject(url, Map.class);
        } catch (RestClientException ex) {
            throw new BadRequestException("Invalid Google credential");
        }
        if (res == null) {
            throw new BadRequestException("Invalid Google credential");
        }

        String aud = asString(res.get("aud"));
        if (!googleClientId.equals(aud)) {
            throw new BadRequestException("Google credential audience mismatch");
        }

        String sub = asString(res.get("sub"));
        String email = asString(res.get("email"));
        String name = asString(res.get("name"));
        String emailVerified = asString(res.get("email_verified"));

        if (sub == null || sub.isBlank()) {
            throw new BadRequestException("Invalid Google credential");
        }
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Google account has no email");
        }
        if (emailVerified != null && !emailVerified.isBlank() && !"true".equalsIgnoreCase(emailVerified)) {
            throw new BadRequestException("Google email is not verified");
        }

        return new GoogleTokenInfo(sub, email, name);
    }

    private static String asString(Object v) {
        return v == null ? null : String.valueOf(v);
    }

    public record GoogleTokenInfo(String sub, String email, String name) {}
}
