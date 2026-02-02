package com.ecommerce.dto.request;

import java.util.ArrayList;
import java.util.List;

public class AdminProductImportRequest {

    private AdminProductImportMode mode = AdminProductImportMode.CREATE;

    private List<Long> categoryIds = new ArrayList<>();

    public AdminProductImportRequest() {}

    public AdminProductImportMode getMode() {
        return mode;
    }

    public void setMode(AdminProductImportMode mode) {
        this.mode = mode;
    }

    public List<Long> getCategoryIds() {
        return categoryIds;
    }

    public void setCategoryIds(List<Long> categoryIds) {
        this.categoryIds = categoryIds;
    }
}
