package com.ecommerce.dto.response;

import java.time.Instant;

public class AdminBranchStockResponse {

    private Long productId;

    private Integer stock;

    private Instant updatedAt;

    public AdminBranchStockResponse() {}

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
