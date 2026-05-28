package com.ecommerce.dto.response;

public class AdminBranchStatsResponse {

    private Long productCount;

    private Long totalStock;

    private Long orderCount;

    public AdminBranchStatsResponse() {}

    public AdminBranchStatsResponse(Long productCount, Long totalStock, Long orderCount) {
        this.productCount = productCount;
        this.totalStock = totalStock;
        this.orderCount = orderCount;
    }

    public Long getProductCount() {
        return productCount;
    }

    public void setProductCount(Long productCount) {
        this.productCount = productCount;
    }

    public Long getTotalStock() {
        return totalStock;
    }

    public void setTotalStock(Long totalStock) {
        this.totalStock = totalStock;
    }

    public Long getOrderCount() {
        return orderCount;
    }

    public void setOrderCount(Long orderCount) {
        this.orderCount = orderCount;
    }
}
