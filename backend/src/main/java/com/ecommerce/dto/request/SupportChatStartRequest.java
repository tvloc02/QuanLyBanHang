package com.ecommerce.dto.request;

public class SupportChatStartRequest {

    private String guestToken;

    public SupportChatStartRequest() {}

    public String getGuestToken() {
        return guestToken;
    }

    public void setGuestToken(String guestToken) {
        this.guestToken = guestToken;
    }
}
