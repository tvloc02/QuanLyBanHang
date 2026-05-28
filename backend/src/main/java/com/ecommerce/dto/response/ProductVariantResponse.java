package com.ecommerce.dto.response;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductVariantResponse {

    private Long id;
    private String color;
    private BigDecimal price;
    private BigDecimal oldPrice;
    private List<String> images = new ArrayList<>();
    private List<ProductVariantSizeStockResponse> stocks = new ArrayList<>();
    private Boolean active;

    public ProductVariantResponse() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getOldPrice() {
        return oldPrice;
    }

    public void setOldPrice(BigDecimal oldPrice) {
        this.oldPrice = oldPrice;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public List<ProductVariantSizeStockResponse> getStocks() {
        return stocks;
    }

    public void setStocks(List<ProductVariantSizeStockResponse> stocks) {
        this.stocks = stocks;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
