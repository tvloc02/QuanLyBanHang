package com.ecommerce.dto.response;

public class ChatQuotaResponse {

    private boolean authenticated;

    private int limit;

    private int remaining;

    private long resetAt;

    public ChatQuotaResponse() {}

    public ChatQuotaResponse(boolean authenticated, int limit, int remaining, long resetAt) {
        this.authenticated = authenticated;
        this.limit = limit;
        this.remaining = remaining;
        this.resetAt = resetAt;
    }

    public boolean isAuthenticated() {
        return authenticated;
    }

    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    public int getLimit() {
        return limit;
    }

    public void setLimit(int limit) {
        this.limit = limit;
    }

    public int getRemaining() {
        return remaining;
    }

    public void setRemaining(int remaining) {
        this.remaining = remaining;
    }

    public long getResetAt() {
        return resetAt;
    }

    public void setResetAt(long resetAt) {
        this.resetAt = resetAt;
    }
}
