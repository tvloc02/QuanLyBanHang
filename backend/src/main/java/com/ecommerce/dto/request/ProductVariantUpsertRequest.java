package com.ecommerce.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductVariantUpsertRequest {

    @NotBlank
    private String color;

    @NotNull
    @PositiveOrZero
    private BigDecimal price;

    private BigDecimal oldPrice;

    private List<String> images = new ArrayList<>();

    @Valid
    private List<ProductVariantSizeStockRequest> stocks = new ArrayList<>();

    private Boolean active;

    public ProductVariantUpsertRequest() {}

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

    public List<ProductVariantSizeStockRequest> getStocks() {
        return stocks;
    }

    public void setStocks(List<ProductVariantSizeStockRequest> stocks) {
        this.stocks = stocks;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
