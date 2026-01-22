package com.ecommerce.dto.response;

import java.time.Instant;

public class AdminMailSettingsResponse {

    private Boolean enabled;

    private String smtpHost;

    private Integer smtpPort;

    private String smtpUsername;

    private Boolean hasPassword;

    private String fromEmail;

    private String fromName;

    private Boolean useTls;

    private Instant updatedAt;

    public AdminMailSettingsResponse() {}

    public AdminMailSettingsResponse(Boolean enabled, String smtpHost, Integer smtpPort, String smtpUsername, Boolean hasPassword, String fromEmail, String fromName, Boolean useTls, Instant updatedAt) {
        this.enabled = enabled;
        this.smtpHost = smtpHost;
        this.smtpPort = smtpPort;
        this.smtpUsername = smtpUsername;
        this.hasPassword = hasPassword;
        this.fromEmail = fromEmail;
        this.fromName = fromName;
        this.useTls = useTls;
        this.updatedAt = updatedAt;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public String getSmtpUsername() {
        return smtpUsername;
    }

    public void setSmtpUsername(String smtpUsername) {
        this.smtpUsername = smtpUsername;
    }

    public Boolean getHasPassword() {
        return hasPassword;
    }

    public void setHasPassword(Boolean hasPassword) {
        this.hasPassword = hasPassword;
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public void setFromEmail(String fromEmail) {
        this.fromEmail = fromEmail;
    }

    public String getFromName() {
        return fromName;
    }

    public void setFromName(String fromName) {
        this.fromName = fromName;
    }

    public Boolean getUseTls() {
        return useTls;
    }

    public void setUseTls(Boolean useTls) {
        this.useTls = useTls;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
