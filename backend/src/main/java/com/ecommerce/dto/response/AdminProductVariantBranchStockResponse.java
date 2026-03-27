package com.ecommerce.dto.response;

import java.time.Instant;

public class AdminProductVariantBranchStockResponse {

    private Long branchId;
    private Long productId;
    private String color;
    private String size;
    private Integer stock;
    private String imageUrl;
    private Double weightKg;
    private Instant updatedAt;

    public AdminProductVariantBranchStockResponse() {}

    public AdminProductVariantBranchStockResponse(Long branchId, Long productId, String color, String size, Integer stock, String imageUrl, Double weightKg, Instant updatedAt) {
        this.branchId = branchId;
        this.productId = productId;
        this.color = color;
        this.size = size;
        this.stock = stock;
        this.imageUrl = imageUrl;
        this.weightKg = weightKg;
        this.updatedAt = updatedAt;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public Double getWeightKg() {
        return weightKg;
    }

    public void setWeightKg(Double weightKg) {
        this.weightKg = weightKg;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
