package com.ecommerce.dto.request;

public class AdminBranchStockUpsertRequest {

    private Long productId;

    private Integer stock;

    public AdminBranchStockUpsertRequest() {}

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
}
