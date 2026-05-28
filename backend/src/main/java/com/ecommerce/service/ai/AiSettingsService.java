package com.ecommerce.service.ai;

import com.ecommerce.dto.request.AdminAiSettingsUpdateRequest;
import com.ecommerce.dto.response.AdminAiSettingsResponse;
import com.ecommerce.model.entity.AiSettings;
import com.ecommerce.repository.AiSettingsRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiSettingsService {

    private final AiSettingsRepository repo;
    private final EncryptionService encryptionService;

    public AiSettingsService(AiSettingsRepository repo, EncryptionService encryptionService) {
        this.repo = repo;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public AiSettings getOrCreate() {
        List<AiSettings> all = repo.findAll();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        AiSettings s = new AiSettings();
        s.setDefaultProvider("gemini");
        Instant now = Instant.now();
        s.setCreatedAt(now);
        s.setUpdatedAt(now);
        return repo.save(s);
    }

    @Transactional(readOnly = true)
    public AdminAiSettingsResponse getAdminView() {
        AiSettings s = getOrCreate();
        boolean hasGemini = s.getGeminiApiKeyEncrypted() != null && !s.getGeminiApiKeyEncrypted().isBlank();
        boolean hasOpenai = s.getOpenaiApiKeyEncrypted() != null && !s.getOpenaiApiKeyEncrypted().isBlank();
        return new AdminAiSettingsResponse(s.getDefaultProvider(), hasGemini, hasOpenai, s.getUpdatedAt());
    }

    @Transactional
    public AdminAiSettingsResponse update(AdminAiSettingsUpdateRequest req) {
        AiSettings s = getOrCreate();
        if (req != null) {
            if (req.getDefaultProvider() != null && !req.getDefaultProvider().trim().isEmpty()) {
                s.setDefaultProvider(normalizeProvider(req.getDefaultProvider()));
            }

            if (req.getGeminiApiKey() != null) {
                String v = req.getGeminiApiKey().trim();
                if (v.isEmpty()) {
                    s.setGeminiApiKeyEncrypted(null);
                } else {
                    s.setGeminiApiKeyEncrypted(encryptionService.encryptToBase64(v));
                }
            }

            if (req.getOpenaiApiKey() != null) {
                String v = req.getOpenaiApiKey().trim();
                if (v.isEmpty()) {
                    s.setOpenaiApiKeyEncrypted(null);
                } else {
                    s.setOpenaiApiKeyEncrypted(encryptionService.encryptToBase64(v));
                }
            }
        }
        s.setUpdatedAt(Instant.now());
        repo.save(s);
        return getAdminView();
    }

    public String getDefaultProvider() {
        return getOrCreate().getDefaultProvider();
    }

    public String getGeminiApiKey() {
        AiSettings s = getOrCreate();
        return encryptionService.decryptFromBase64(s.getGeminiApiKeyEncrypted());
    }

    public String getOpenaiApiKey() {
        AiSettings s = getOrCreate();
        return encryptionService.decryptFromBase64(s.getOpenaiApiKeyEncrypted());
    }

    private static String normalizeProvider(String p) {
        if (p == null) return "gemini";
        String v = p.trim().toLowerCase();
        if (v.equals("openai") || v.equals("chatgpt")) return "openai";
        return "gemini";
    }
}
