package com.ecommerce.controller.chat;

import com.ecommerce.dto.request.ChatRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.ChatQuotaResponse;
import com.ecommerce.dto.response.ChatResponse;
import com.ecommerce.security.SecurityUtils;
import com.ecommerce.service.ai.ChatbotProxyService;
import com.ecommerce.service.ai.ChatGuestLimiterService;
import com.ecommerce.util.RequestIpUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatbotProxyService chatbotProxyService;
    private final ChatGuestLimiterService chatGuestLimiterService;

    public ChatController(ChatbotProxyService chatbotProxyService, ChatGuestLimiterService chatGuestLimiterService) {
        this.chatbotProxyService = chatbotProxyService;
        this.chatGuestLimiterService = chatGuestLimiterService;
    }

    @GetMapping("/quota")
    public ResponseEntity<ApiResponse<ChatQuotaResponse>> quota(HttpServletRequest request) {
        Long userId = SecurityUtils.currentUserId();
        boolean authed = userId != null;
        if (authed) {
            return ResponseEntity.ok(ApiResponse.ok(new ChatQuotaResponse(true, -1, -1, -1)));
        }
        String ip = RequestIpUtils.getClientIp(request);
        ChatGuestLimiterService.Quota q = chatGuestLimiterService.getQuota(ip);
        return ResponseEntity.ok(ApiResponse.ok(new ChatQuotaResponse(false, q.getLimit(), q.getRemaining(), q.getResetAt())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ChatResponse>> chat(@RequestBody ChatRequest req, HttpServletRequest request) {
        Long userId = SecurityUtils.currentUserId();
        boolean authed = userId != null;

        if (!authed) {
            String ip = RequestIpUtils.getClientIp(request);
            chatGuestLimiterService.consumeOrThrow(ip);
        }

        return ResponseEntity.ok(ApiResponse.ok(chatbotProxyService.chat(req)));
    }
}
