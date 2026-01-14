package com.ecommerce.dto.response;

import java.math.BigDecimal;

public class CouponPreviewResponse {

    private String couponCode;

    private BigDecimal subtotal;

    private BigDecimal discount;

    private BigDecimal totalAfterDiscount;

    public CouponPreviewResponse() {}

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getDiscount() {
        return discount;
    }

    public void setDiscount(BigDecimal discount) {
        this.discount = discount;
    }

    public BigDecimal getTotalAfterDiscount() {
        return totalAfterDiscount;
    }

    public void setTotalAfterDiscount(BigDecimal totalAfterDiscount) {
        this.totalAfterDiscount = totalAfterDiscount;
    }
}
