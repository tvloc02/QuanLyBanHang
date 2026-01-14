package com.ecommerce.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final Key key = Keys.hmacShaKeyFor("fashionhub-fashionhub-fashionhub-fashionhub".getBytes(StandardCharsets.UTF_8));

    public String generateToken(String subject) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subject)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(60 * 60)))
                .signWith(key)
                .compact();
    }

    public String extractSubject(String token) {
        return Jwts.parser().verifyWith(Keys.hmacShaKeyFor(key.getEncoded())).build().parseSignedClaims(token).getPayload().getSubject();
    }

    public boolean isValid(String token) {
        try {
            extractSubject(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
