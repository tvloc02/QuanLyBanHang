package com.ecommerce.dto.response;

public class ProductVariantSizeStockResponse {

    private String size;
    private Integer stock;

    public ProductVariantSizeStockResponse() {}

    public ProductVariantSizeStockResponse(String size, Integer stock) {
        this.size = size;
        this.stock = stock;
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
}
