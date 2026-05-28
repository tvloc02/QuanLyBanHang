package com.ecommerce.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "ai_settings")
public class AiSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20)
    private String defaultProvider;

    @Column(length = 4000)
    private String geminiApiKeyEncrypted;

    @Column(length = 4000)
    private String openaiApiKeyEncrypted;

    private Instant createdAt;

    private Instant updatedAt;

    public AiSettings() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDefaultProvider() {
        return defaultProvider;
    }

    public void setDefaultProvider(String defaultProvider) {
        this.defaultProvider = defaultProvider;
    }

    public String getGeminiApiKeyEncrypted() {
        return geminiApiKeyEncrypted;
    }

    public void setGeminiApiKeyEncrypted(String geminiApiKeyEncrypted) {
        this.geminiApiKeyEncrypted = geminiApiKeyEncrypted;
    }

    public String getOpenaiApiKeyEncrypted() {
        return openaiApiKeyEncrypted;
    }

    public void setOpenaiApiKeyEncrypted(String openaiApiKeyEncrypted) {
        this.openaiApiKeyEncrypted = openaiApiKeyEncrypted;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
