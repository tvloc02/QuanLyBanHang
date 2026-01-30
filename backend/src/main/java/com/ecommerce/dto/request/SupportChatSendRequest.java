package com.ecommerce.dto.request;

public class SupportChatSendRequest {

    private String guestToken;

    private String message;

    public SupportChatSendRequest() {}

    public String getGuestToken() {
        return guestToken;
    }

    public void setGuestToken(String guestToken) {
        this.guestToken = guestToken;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
