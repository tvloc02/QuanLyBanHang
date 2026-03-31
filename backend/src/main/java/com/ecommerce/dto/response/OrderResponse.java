package com.ecommerce.dto.response;

import com.ecommerce.model.entity.OrderItem;
import com.ecommerce.model.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class OrderResponse {

    private Long id;

    private String orderCode;

    private Long userId;

    private OrderStatus status;

    private BigDecimal subtotal;

    private BigDecimal discount;

    private BigDecimal shippingFee;

    private BigDecimal total;

    private String couponCode;

    private Long branchId;

    private Double shippingDistanceKm;

    private String shippingPhone;

    private Instant createdAt;

    private List<Item> items = new ArrayList<>();

    public OrderResponse() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getDiscount() {
        return discount;
    }

    public void setDiscount(BigDecimal discount) {
        this.discount = discount;
    }

    public BigDecimal getShippingFee() {
        return shippingFee;
    }

    public void setShippingFee(BigDecimal shippingFee) {
        this.shippingFee = shippingFee;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public Long getBranchId() {
        return branchId;
    }

    public void setBranchId(Long branchId) {
        this.branchId = branchId;
    }

    public Double getShippingDistanceKm() {
        return shippingDistanceKm;
    }

    public void setShippingDistanceKm(Double shippingDistanceKm) {
        this.shippingDistanceKm = shippingDistanceKm;
    }

    public String getShippingPhone() {
        return shippingPhone;
    }

    public void setShippingPhone(String shippingPhone) {
        this.shippingPhone = shippingPhone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }

    public static class Item {
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;

        public Item() {}

        public static Item from(OrderItem src) {
            Item item = new Item();
            if (src == null) {
                return item;
            }
            item.setProductId(src.getProductId());
            item.setProductName(src.getProductName());
            item.setQuantity(src.getQuantity());
            item.setUnitPrice(src.getUnitPrice());
            item.setTotalPrice(src.getTotalPrice());
            return item;
        }

        public Long getProductId() {
            return productId;
        }

        public void setProductId(Long productId) {
            this.productId = productId;
        }

        public String getProductName() {
            return productName;
        }

        public void setProductName(String productName) {
            this.productName = productName;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getUnitPrice() {
            return unitPrice;
        }

        public void setUnitPrice(BigDecimal unitPrice) {
            this.unitPrice = unitPrice;
        }

        public BigDecimal getTotalPrice() {
            return totalPrice;
        }

        public void setTotalPrice(BigDecimal totalPrice) {
            this.totalPrice = totalPrice;
        }
    }
}
