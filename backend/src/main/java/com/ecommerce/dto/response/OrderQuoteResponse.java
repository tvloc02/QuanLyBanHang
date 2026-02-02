package com.ecommerce.dto.response;

import java.math.BigDecimal;

public class OrderQuoteResponse {

    private Long branchId;

    private Double shippingDistanceKm;

    private BigDecimal shippingFee;

    public OrderQuoteResponse() {}

    public OrderQuoteResponse(Long branchId, Double shippingDistanceKm, BigDecimal shippingFee) {
        this.branchId = branchId;
        this.shippingDistanceKm = shippingDistanceKm;
        this.shippingFee = shippingFee;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Double getShippingDistanceKm() {
        return shippingDistanceKm;
    }

    public void setShippingDistanceKm(Double shippingDistanceKm) {
        this.shippingDistanceKm = shippingDistanceKm;
    }

    public BigDecimal getShippingFee() {
        return shippingFee;
    }

    public void setShippingFee(BigDecimal shippingFee) {
        this.shippingFee = shippingFee;
    }
}
