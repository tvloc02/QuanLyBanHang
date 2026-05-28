package com.ecommerce.dto.request;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.List;

public class OrderQuoteRequest {

    @Valid
    private List<OrderItemRequest> items = new ArrayList<>();

    private Long branchId;

    private Double shippingLatitude;

    private Double shippingLongitude;

    public OrderQuoteRequest() {}

    public List<OrderItemRequest> getItems() {
        return items;
    }

    public void setItems(List<OrderItemRequest> items) {
        this.items = items;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Double getShippingLatitude() {
        return shippingLatitude;
    }

    public void setShippingLatitude(Double shippingLatitude) {
        this.shippingLatitude = shippingLatitude;
    }

    public Double getShippingLongitude() {
        return shippingLongitude;
    }

    public void setShippingLongitude(Double shippingLongitude) {
        this.shippingLongitude = shippingLongitude;
    }
}
