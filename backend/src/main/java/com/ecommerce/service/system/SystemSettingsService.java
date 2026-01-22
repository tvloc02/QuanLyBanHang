package com.ecommerce.service.system;

import com.ecommerce.dto.request.AdminMailSettingsUpdateRequest;
import com.ecommerce.dto.request.AdminNotificationSettingsUpdateRequest;
import com.ecommerce.dto.response.AdminMailSettingsResponse;
import com.ecommerce.dto.response.AdminNotificationSettingsResponse;
import com.ecommerce.model.entity.SystemSettings;
import com.ecommerce.repository.SystemSettingsRepository;
import com.ecommerce.service.ai.EncryptionService;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemSettingsService {

    private final SystemSettingsRepository repo;
    private final EncryptionService encryptionService;

    public SystemSettingsService(SystemSettingsRepository repo, EncryptionService encryptionService) {
        this.repo = repo;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public SystemSettings getOrCreate() {
        List<SystemSettings> all = repo.findAll();
        if (!all.isEmpty()) {
            return all.get(0);
        }
        SystemSettings s = new SystemSettings();
        Instant now = Instant.now();
        s.setSmtpEnabled(false);
        s.setSmtpUseTls(true);
        s.setNotificationsEnabled(true);
        s.setNotifyNewOrder(true);
        s.setNotifyOrderStatus(true);
        s.setNotifyLowStock(false);
        s.setCreatedAt(now);
        s.setUpdatedAt(now);
        return repo.save(s);
    }

    @Transactional
    public AdminMailSettingsResponse getMailSettings() {
        SystemSettings s = getOrCreate();
        boolean hasPassword = s.getSmtpPasswordEncrypted() != null && !s.getSmtpPasswordEncrypted().isBlank();
        return new AdminMailSettingsResponse(
            s.getSmtpEnabled(),
            s.getSmtpHost(),
            s.getSmtpPort(),
            s.getSmtpUsername(),
            hasPassword,
            s.getSmtpFromEmail(),
            s.getSmtpFromName(),
            s.getSmtpUseTls(),
            s.getUpdatedAt()
        );
    }

    @Transactional
    public AdminMailSettingsResponse updateMailSettings(AdminMailSettingsUpdateRequest req) {
        SystemSettings s = getOrCreate();
        if (req != null) {
            if (req.getEnabled() != null) s.setSmtpEnabled(req.getEnabled());
            if (req.getSmtpHost() != null) s.setSmtpHost(trimToNull(req.getSmtpHost()));
            if (req.getSmtpPort() != null) s.setSmtpPort(req.getSmtpPort());
            if (req.getSmtpUsername() != null) s.setSmtpUsername(trimToNull(req.getSmtpUsername()));
            if (req.getFromEmail() != null) s.setSmtpFromEmail(trimToNull(req.getFromEmail()));
            if (req.getFromName() != null) s.setSmtpFromName(trimToNull(req.getFromName()));
            if (req.getUseTls() != null) s.setSmtpUseTls(req.getUseTls());

            if (req.getSmtpPassword() != null) {
                String v = req.getSmtpPassword().trim();
                if (v.isEmpty()) {
                    s.setSmtpPasswordEncrypted(null);
                } else {
                    s.setSmtpPasswordEncrypted(encryptionService.encryptToBase64(v));
                }
            }
        }
        s.setUpdatedAt(Instant.now());
        repo.save(s);
        return getMailSettings();
    }

    @Transactional
    public AdminNotificationSettingsResponse getNotificationSettings() {
        SystemSettings s = getOrCreate();
        return new AdminNotificationSettingsResponse(
            s.getNotificationsEnabled(),
            s.getNotifyNewOrder(),
            s.getNotifyOrderStatus(),
            s.getNotifyLowStock(),
            s.getUpdatedAt()
        );
    }

    @Transactional
    public AdminNotificationSettingsResponse updateNotificationSettings(AdminNotificationSettingsUpdateRequest req) {
        SystemSettings s = getOrCreate();
        if (req != null) {
            if (req.getEnabled() != null) s.setNotificationsEnabled(req.getEnabled());
            if (req.getNotifyNewOrder() != null) s.setNotifyNewOrder(req.getNotifyNewOrder());
            if (req.getNotifyOrderStatus() != null) s.setNotifyOrderStatus(req.getNotifyOrderStatus());
            if (req.getNotifyLowStock() != null) s.setNotifyLowStock(req.getNotifyLowStock());
        }
        s.setUpdatedAt(Instant.now());
        repo.save(s);
        return getNotificationSettings();
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String v = s.trim();
        return v.isEmpty() ? null : v;
    }
}
