package com.ecommerce.dto.response;

import com.ecommerce.model.enums.SupportMessageSenderType;
import java.time.Instant;

public class SupportMessageResponse {

    private Long id;

    private Long conversationId;

    private SupportMessageSenderType senderType;

    private Long senderUserId;

    private String message;

    private Instant createdAt;

    public SupportMessageResponse() {}

    public SupportMessageResponse(
        Long id,
        Long conversationId,
        SupportMessageSenderType senderType,
        Long senderUserId,
        String message,
        Instant createdAt
    ) {
        this.id = id;
        this.conversationId = conversationId;
        this.senderType = senderType;
        this.senderUserId = senderUserId;
        this.message = message;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }

    public SupportMessageSenderType getSenderType() {
        return senderType;
    }

    public void setSenderType(SupportMessageSenderType senderType) {
        this.senderType = senderType;
    }

    public Long getSenderUserId() {
        return senderUserId;
    }

    public void setSenderUserId(Long senderUserId) {
        this.senderUserId = senderUserId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
