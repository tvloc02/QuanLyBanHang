package com.ecommerce.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "system_settings")
public class SystemSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255)
    private String smtpHost;

    private Integer smtpPort;

    @Column(length = 255)
    private String smtpUsername;

    @Column(length = 4000)
    private String smtpPasswordEncrypted;

    @Column(length = 255)
    private String smtpFromEmail;

    @Column(length = 255)
    private String smtpFromName;

    private Boolean smtpUseTls;

    private Boolean smtpEnabled;

    private Boolean notificationsEnabled;

    private Boolean notifyNewOrder;

    private Boolean notifyOrderStatus;

    private Boolean notifyLowStock;

    private Instant createdAt;

    private Instant updatedAt;

    public SystemSettings() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public void setSmtpHost(String smtpHost) {
        this.smtpHost = smtpHost;
    }

    public Integer getSmtpPort() {
        return smtpPort;
    }

    public void setSmtpPort(Integer smtpPort) {
        this.smtpPort = smtpPort;
    }

    public String getSmtpUsername() {
        return smtpUsername;
    }

    public void setSmtpUsername(String smtpUsername) {
        this.smtpUsername = smtpUsername;
    }

    public String getSmtpPasswordEncrypted() {
        return smtpPasswordEncrypted;
    }

    public void setSmtpPasswordEncrypted(String smtpPasswordEncrypted) {
        this.smtpPasswordEncrypted = smtpPasswordEncrypted;
    }

    public String getSmtpFromEmail() {
        return smtpFromEmail;
    }

    public void setSmtpFromEmail(String smtpFromEmail) {
        this.smtpFromEmail = smtpFromEmail;
    }

    public String getSmtpFromName() {
        return smtpFromName;
    }

    public void setSmtpFromName(String smtpFromName) {
        this.smtpFromName = smtpFromName;
    }

    public Boolean getSmtpUseTls() {
        return smtpUseTls;
    }

    public void setSmtpUseTls(Boolean smtpUseTls) {
        this.smtpUseTls = smtpUseTls;
    }

    public Boolean getSmtpEnabled() {
        return smtpEnabled;
    }

    public void setSmtpEnabled(Boolean smtpEnabled) {
        this.smtpEnabled = smtpEnabled;
    }

    public Boolean getNotificationsEnabled() {
        return notificationsEnabled;
    }

    public void setNotificationsEnabled(Boolean notificationsEnabled) {
        this.notificationsEnabled = notificationsEnabled;
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
}
