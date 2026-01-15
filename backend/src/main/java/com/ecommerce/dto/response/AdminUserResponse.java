package com.ecommerce.dto.response;

import java.time.Instant;
import java.util.Set;

public class AdminUserResponse {

    private Long id;

    private String fullName;

    private String email;

    private String username;

    private String phone;

    private Set<String> roles;

    private Boolean enabled;

    private Instant createdAt;

    public AdminUserResponse() {}

    public AdminUserResponse(
        Long id,
        String fullName,
        String email,
        String username,
        String phone,
        Set<String> roles,
        Boolean enabled,
        Instant createdAt
    ) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.username = username;
        this.phone = phone;
        this.roles = roles;
        this.enabled = enabled;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
