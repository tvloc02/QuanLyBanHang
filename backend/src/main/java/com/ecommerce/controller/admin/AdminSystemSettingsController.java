package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminMailSettingsUpdateRequest;
import com.ecommerce.dto.request.AdminNotificationSettingsUpdateRequest;
import com.ecommerce.dto.response.AdminMailSettingsResponse;
import com.ecommerce.dto.response.AdminNotificationSettingsResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.service.system.SystemSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSystemSettingsController {

    private final SystemSettingsService systemSettingsService;

    public AdminSystemSettingsController(SystemSettingsService systemSettingsService) {
        this.systemSettingsService = systemSettingsService;
    }

    @GetMapping("/mail")
    public ResponseEntity<ApiResponse<AdminMailSettingsResponse>> getMail() {
        return ResponseEntity.ok(ApiResponse.ok(systemSettingsService.getMailSettings()));
    }

    @PutMapping("/mail")
    public ResponseEntity<ApiResponse<AdminMailSettingsResponse>> updateMail(@RequestBody AdminMailSettingsUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(systemSettingsService.updateMailSettings(req)));
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<AdminNotificationSettingsResponse>> getNotifications() {
        return ResponseEntity.ok(ApiResponse.ok(systemSettingsService.getNotificationSettings()));
    }

    @PutMapping("/notifications")
    public ResponseEntity<ApiResponse<AdminNotificationSettingsResponse>> updateNotifications(@RequestBody AdminNotificationSettingsUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(systemSettingsService.updateNotificationSettings(req)));
    }
}
