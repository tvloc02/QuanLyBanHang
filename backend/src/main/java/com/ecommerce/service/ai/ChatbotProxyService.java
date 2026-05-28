package com.ecommerce.service.ai;

import com.ecommerce.dto.request.ChatRequest;
import com.ecommerce.dto.response.ChatResponse;
import com.ecommerce.exception.BadRequestException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class ChatbotProxyService {

    private final AiSettingsService aiSettingsService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${chatbot.base-url:http://localhost:8001}")
    private String chatbotBaseUrl;

    @Value("${app.public-base-url:http://localhost:8081}")
    private String appPublicBaseUrl;

    public ChatbotProxyService(AiSettingsService aiSettingsService) {
        this.aiSettingsService = aiSettingsService;
    }

    public ChatResponse chat(ChatRequest req) {
        if (req == null || req.getMessage() == null || req.getMessage().isBlank()) {
            throw new BadRequestException("message is required");
        }

        String provider = aiSettingsService.getDefaultProvider();
        if (provider == null || provider.isBlank()) provider = "gemini";

        String apiKey;
        if ("openai".equalsIgnoreCase(provider)) {
            apiKey = aiSettingsService.getOpenaiApiKey();
        } else {
            apiKey = aiSettingsService.getGeminiApiKey();
            provider = "gemini";
        }

        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("AI provider is not configured");
        }

        String url = chatbotBaseUrl.endsWith("/") ? chatbotBaseUrl + "chat" : chatbotBaseUrl + "/chat";

        Map<String, Object> payload = Map.of(
            "provider", provider,
            "apiKey", apiKey,
            "message", req.getMessage(),
            "backendBaseUrl", appPublicBaseUrl
        );

        Map<?, ?> res;
        try {
            res = restTemplate.postForObject(url, payload, Map.class);
        } catch (RestClientException ex) {
            throw new BadRequestException("Chatbot service not available");
        }
        if (res == null) {
            throw new BadRequestException("Chatbot service error");
        }

        Object answerObj = res.get("answer");
        String answer = answerObj == null ? null : String.valueOf(answerObj);
        if (answer == null) answer = "";

        return new ChatResponse(provider, answer);
    }
}
