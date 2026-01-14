package com.ecommerce.dto.response;

import java.util.List;

public class ProductSearchResponse {
    private List<ProductDto> data;
    private long total;
    private int page;
    private int totalPages;
    private int limit;

    // Getters & Setters
    public List<ProductDto> getData() { return data; }
    public void setData(List<ProductDto> data) { this.data = data; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public int getLimit() { return limit; }
    public void setLimit(int limit) { this.limit = limit; }
}
