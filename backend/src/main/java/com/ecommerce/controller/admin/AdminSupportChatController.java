package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminSupportChatSendRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.SupportConversationResponse;
import com.ecommerce.dto.response.SupportMessageResponse;
import com.ecommerce.security.SecurityUtils;
import com.ecommerce.service.support.SupportChatService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/support-chat")
public class AdminSupportChatController {

    private final SupportChatService supportChatService;

    public AdminSupportChatController(SupportChatService supportChatService) {
        this.supportChatService = supportChatService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<SupportConversationResponse>>> listConversations(
        @RequestParam(value = "status", required = false) String status
    ) {
        if (status != null && status.equalsIgnoreCase("all")) {
            return ResponseEntity.ok(ApiResponse.ok(supportChatService.adminListAll()));
        }
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.adminListOpenConversations()));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<List<SupportMessageResponse>>> listMessages(@PathVariable("id") Long conversationId) {
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.adminListMessages(conversationId)));
    }

    @PostMapping("/conversations/{id}/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> send(
        @PathVariable("id") Long conversationId,
        @RequestBody AdminSupportChatSendRequest req
    ) {
        Long staffUserId = SecurityUtils.currentUserId();
        String message = req != null ? req.getMessage() : null;
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.adminSend(staffUserId, conversationId, message)));
    }

    @PutMapping("/conversations/{id}/close")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> close(@PathVariable("id") Long conversationId) {
        Long staffUserId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.adminCloseConversation(staffUserId, conversationId)));
    }
}
