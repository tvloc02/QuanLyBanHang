package com.ecommerce.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminOrderSummaryResponse {

    private Long id;

    private String orderCode;

    private Long userId;

    private String status;

    private BigDecimal total;

    private Integer itemCount;

    private String couponCode;

    private Long branchId;

    private String branchCode;

    private String branchName;

    private Instant createdAt;

    public AdminOrderSummaryResponse() {}

    public AdminOrderSummaryResponse(
        Long id,
        String orderCode,
        Long userId,
        String status,
        BigDecimal total,
        Integer itemCount,
        String couponCode,
        Long branchId,
        String branchCode,
        String branchName,
        Instant createdAt
    ) {
        this.id = id;
        this.orderCode = orderCode;
        this.userId = userId;
        this.status = status;
        this.total = total;
        this.itemCount = itemCount;
        this.couponCode = couponCode;
        this.branchId = branchId;
        this.branchCode = branchCode;
        this.branchName = branchName;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
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

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public String getBranchCode() {
        return branchCode;
    }

    public void setBranchCode(String branchCode) {
        this.branchCode = branchCode;
    }

    public String getBranchName() {
        return branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
