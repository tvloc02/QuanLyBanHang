package com.ecommerce.dto.request;

import java.util.ArrayList;
import java.util.List;

public class AdminProductExportRequest {

    private List<Long> productIds = new ArrayList<>();

    public AdminProductExportRequest() {}

    public List<Long> getProductIds() {
        return productIds;
    }

    public void setProductIds(List<Long> productIds) {
        this.productIds = productIds;
    }
}
