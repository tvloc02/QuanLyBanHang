package com.ecommerce.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ProductVariantSizeStock {

    @Column(name = "size")
    private String size;

    @Column(name = "stock")
    private Integer stock;

    public ProductVariantSizeStock() {}

    public ProductVariantSizeStock(String size, Integer stock) {
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
