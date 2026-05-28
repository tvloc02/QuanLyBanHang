package com.ecommerce.dto.request;

public class AdminProductBranchStockUpsertRequest {

    private Long branchId;

    private Integer stock;

    public AdminProductBranchStockUpsertRequest() {}

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }
}
