package com.ecommerce.dto.response;

import com.ecommerce.model.enums.SupportConversationStatus;
import java.time.Instant;

public class SupportConversationResponse {

    private Long id;

    private Long userId;

    private String guestToken;

    private SupportConversationStatus status;

    private Long assignedStaffId;

    private Instant createdAt;

    private Instant updatedAt;

    private Instant lastMessageAt;

    public SupportConversationResponse() {}

    public SupportConversationResponse(
        Long id,
        Long userId,
        String guestToken,
        SupportConversationStatus status,
        Long assignedStaffId,
        Instant createdAt,
        Instant updatedAt,
        Instant lastMessageAt
    ) {
        this.id = id;
        this.userId = userId;
        this.guestToken = guestToken;
        this.status = status;
        this.assignedStaffId = assignedStaffId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.lastMessageAt = lastMessageAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getGuestToken() {
        return guestToken;
    }

    public void setGuestToken(String guestToken) {
        this.guestToken = guestToken;
    }

    public SupportConversationStatus getStatus() {
        return status;
    }

    public void setStatus(SupportConversationStatus status) {
        this.status = status;
    }

    public Long getAssignedStaffId() {
        return assignedStaffId;
    }

    public void setAssignedStaffId(Long assignedStaffId) {
        this.assignedStaffId = assignedStaffId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Instant getLastMessageAt() {
        return lastMessageAt;
    }

    public void setLastMessageAt(Instant lastMessageAt) {
        this.lastMessageAt = lastMessageAt;
    }
}
