package com.ecommerce.dto.response;

public class ChatResponse {

    private String provider;

    private String answer;

    public ChatResponse() {}

    public ChatResponse(String provider, String answer) {
        this.provider = provider;
        this.answer = answer;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
}
