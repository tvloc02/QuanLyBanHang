package com.ecommerce.dto.response;

import java.util.Set;

public class AuthTokenResponse {

    private Long userId;

    private String token;

    private Set<String> roles;

    public AuthTokenResponse() {}

    public AuthTokenResponse(Long userId, String token, Set<String> roles) {
        this.userId = userId;
        this.token = token;
        this.roles = roles;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }
}
