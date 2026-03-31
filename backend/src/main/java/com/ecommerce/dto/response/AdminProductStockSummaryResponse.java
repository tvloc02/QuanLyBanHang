package com.ecommerce.dto.response;

public class AdminProductStockSummaryResponse {
    private Long productId;
    private Integer totalStock;

    public AdminProductStockSummaryResponse() {}

    public AdminProductStockSummaryResponse(Long productId, Integer totalStock) {
        this.productId = productId;
        this.totalStock = totalStock;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getTotalStock() {
        return totalStock;
    }

    public void setTotalStock(Integer totalStock) {
        this.totalStock = totalStock;
    }
}
