package com.ecommerce.dto.response;

import java.time.Instant;

public class AdminAiSettingsResponse {

    private String defaultProvider;

    private Boolean hasGeminiApiKey;

    private Boolean hasOpenaiApiKey;

    private Instant updatedAt;

    public AdminAiSettingsResponse() {}

    public AdminAiSettingsResponse(String defaultProvider, Boolean hasGeminiApiKey, Boolean hasOpenaiApiKey, Instant updatedAt) {
        this.defaultProvider = defaultProvider;
        this.hasGeminiApiKey = hasGeminiApiKey;
        this.hasOpenaiApiKey = hasOpenaiApiKey;
        this.updatedAt = updatedAt;
    }

    public String getDefaultProvider() {
        return defaultProvider;
    }

    public void setDefaultProvider(String defaultProvider) {
        this.defaultProvider = defaultProvider;
    }

    public Boolean getHasGeminiApiKey() {
        return hasGeminiApiKey;
    }

    public void setHasGeminiApiKey(Boolean hasGeminiApiKey) {
        this.hasGeminiApiKey = hasGeminiApiKey;
    }

    public Boolean getHasOpenaiApiKey() {
        return hasOpenaiApiKey;
    }

    public void setHasOpenaiApiKey(Boolean hasOpenaiApiKey) {
        this.hasOpenaiApiKey = hasOpenaiApiKey;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
