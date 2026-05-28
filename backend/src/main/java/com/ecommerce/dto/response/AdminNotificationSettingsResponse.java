package com.ecommerce.dto.response;

import java.time.Instant;

public class AdminNotificationSettingsResponse {

    private Boolean enabled;

    private Boolean notifyNewOrder;

    private Boolean notifyOrderStatus;

    private Boolean notifyLowStock;

    private Instant updatedAt;

    public AdminNotificationSettingsResponse() {}

    public AdminNotificationSettingsResponse(Boolean enabled, Boolean notifyNewOrder, Boolean notifyOrderStatus, Boolean notifyLowStock, Instant updatedAt) {
        this.enabled = enabled;
        this.notifyNewOrder = notifyNewOrder;
        this.notifyOrderStatus = notifyOrderStatus;
        this.notifyLowStock = notifyLowStock;
        this.updatedAt = updatedAt;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Boolean getNotifyNewOrder() {
        return notifyNewOrder;
    }

    public void setNotifyNewOrder(Boolean notifyNewOrder) {
        this.notifyNewOrder = notifyNewOrder;
    }

    public Boolean getNotifyOrderStatus() {
        return notifyOrderStatus;
    }

    public void setNotifyOrderStatus(Boolean notifyOrderStatus) {
        this.notifyOrderStatus = notifyOrderStatus;
    }

    public Boolean getNotifyLowStock() {
        return notifyLowStock;
    }

    public void setNotifyLowStock(Boolean notifyLowStock) {
        this.notifyLowStock = notifyLowStock;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
