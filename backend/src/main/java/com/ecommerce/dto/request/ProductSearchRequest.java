package com.ecommerce.dto.request;

import java.util.List;

public class ProductSearchRequest {
    private String category;
    private Double minPrice;
    private Double maxPrice;
    private List<String> sizes;
    private List<String> colors;
    private String sort; // price-asc, price-desc, newest, bestselling
    private Integer page = 0;
    private Integer limit = 20;

    // Getters & Setters
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getMinPrice() { return minPrice; }
    public void setMinPrice(Double minPrice) { this.minPrice = minPrice; }

    public Double getMaxPrice() { return maxPrice; }
    public void setMaxPrice(Double maxPrice) { this.maxPrice = maxPrice; }

    public List<String> getSizes() { return sizes; }
    public void setSizes(List<String> sizes) { this.sizes = sizes; }

    public List<String> getColors() { return colors; }
    public void setColors(List<String> colors) { this.colors = colors; }

    public String getSort() { return sort; }
    public void setSort(String sort) { this.sort = sort; }

    public Integer getPage() { return page; }
    public void setPage(Integer page) { this.page = page; }

    public Integer getLimit() { return limit; }
    public void setLimit(Integer limit) { this.limit = limit; }
}
