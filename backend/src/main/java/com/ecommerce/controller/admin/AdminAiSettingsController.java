package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminAiSettingsUpdateRequest;
import com.ecommerce.dto.response.AdminAiSettingsResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.service.ai.AiSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai-settings")
public class AdminAiSettingsController {

    private final AiSettingsService aiSettingsService;

    public AdminAiSettingsController(AiSettingsService aiSettingsService) {
        this.aiSettingsService = aiSettingsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<AdminAiSettingsResponse>> get() {
        return ResponseEntity.ok(ApiResponse.ok(aiSettingsService.getAdminView()));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<AdminAiSettingsResponse>> update(@RequestBody AdminAiSettingsUpdateRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(aiSettingsService.update(req)));
    }
}
