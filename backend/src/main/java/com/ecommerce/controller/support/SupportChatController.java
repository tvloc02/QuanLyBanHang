package com.ecommerce.controller.support;

import com.ecommerce.dto.request.SupportChatSendRequest;
import com.ecommerce.dto.request.SupportChatStartRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.SupportConversationResponse;
import com.ecommerce.dto.response.SupportMessageResponse;
import com.ecommerce.security.SecurityUtils;
import com.ecommerce.service.support.SupportChatService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support-chat")
public class SupportChatController {

    private final SupportChatService supportChatService;

    public SupportChatController(SupportChatService supportChatService) {
        this.supportChatService = supportChatService;
    }

    @PostMapping("/start")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> start(@RequestBody(required = false) SupportChatStartRequest req) {
        Long userId = SecurityUtils.currentUserId();
        String guestToken = req != null ? req.getGuestToken() : null;
        if (userId == null && (guestToken == null || guestToken.trim().isEmpty())) {
            guestToken = SupportChatService.newGuestToken();
        }
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.startOrGetConversation(userId, guestToken)));
    }

    @GetMapping("/conversation")
    public ResponseEntity<ApiResponse<SupportConversationResponse>> getConversation(@RequestParam(value = "guestToken", required = false) String guestToken) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.customerGetConversation(userId, guestToken)));
    }

    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<List<SupportMessageResponse>>> listMessages(@RequestParam(value = "guestToken", required = false) String guestToken) {
        Long userId = SecurityUtils.currentUserId();
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.customerListMessages(userId, guestToken)));
    }

    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<SupportMessageResponse>> send(@RequestBody SupportChatSendRequest req) {
        Long userId = SecurityUtils.currentUserId();
        String guestToken = req != null ? req.getGuestToken() : null;
        String message = req != null ? req.getMessage() : null;
        return ResponseEntity.ok(ApiResponse.ok(supportChatService.customerSend(userId, guestToken, message)));
    }
}
