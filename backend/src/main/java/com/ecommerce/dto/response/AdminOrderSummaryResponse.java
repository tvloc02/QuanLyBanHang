package com.ecommerce.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminOrderSummaryResponse {

    private Long id;

    private Long userId;

    private String status;

    private BigDecimal total;

    private Integer itemCount;

    private String couponCode;

    private Instant createdAt;

    public AdminOrderSummaryResponse() {}

    public AdminOrderSummaryResponse(
        Long id,
        Long userId,
        String status,
        BigDecimal total,
        Integer itemCount,
        String couponCode,
        Instant createdAt
    ) {
        this.id = id;
        this.userId = userId;
        this.status = status;
        this.total = total;
        this.itemCount = itemCount;
        this.couponCode = couponCode;
        this.createdAt = createdAt;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public Integer getItemCount() {
        return itemCount;
    }

    public void setItemCount(Integer itemCount) {
        this.itemCount = itemCount;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
