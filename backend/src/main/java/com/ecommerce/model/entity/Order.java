 package com.ecommerce.model.entity;
 
 import com.ecommerce.model.enums.OrderStatus;
 import jakarta.persistence.CollectionTable;
 import jakarta.persistence.ElementCollection;
 import jakarta.persistence.Entity;
 import jakarta.persistence.EnumType;
 import jakarta.persistence.Enumerated;
 import jakarta.persistence.GeneratedValue;
 import jakarta.persistence.GenerationType;
 import jakarta.persistence.Id;
 import jakarta.persistence.JoinColumn;
 import jakarta.persistence.Table;
 import java.math.BigDecimal;
 import java.time.Instant;
 import java.util.ArrayList;
 import java.util.List;
 
 @Entity
 @Table(name = "orders")
 public class Order {
 
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;
 
     private Long userId;
 
     @ElementCollection
     @CollectionTable(name = "order_items", joinColumns = @JoinColumn(name = "order_id"))
     private List<OrderItem> items = new ArrayList<>();
 
     @Enumerated(EnumType.STRING)
     private OrderStatus status = OrderStatus.PENDING;
 
     private BigDecimal subtotal;
 
     private BigDecimal discount;
 
     private BigDecimal shippingFee;
 
     private BigDecimal total;
 
     private String couponCode;
 
     private String shippingFullName;
 
     private String shippingPhone;
 
     private String shippingProvince;
 
     private String shippingWard;
 
     private String shippingAddressDetail;
 
     private Long paymentId;
 
     private Instant createdAt;
 
     private Instant updatedAt;
 
     public Order() {}
 
     public Long getId() {
         return id;
     }
 
     public void setId(Long id) {
         this.id = id;
     }
 
     public Long getUserId() {
         return userId;
     }
 
     public void setUserId(Long userId) {
         this.userId = userId;
     }
 
     public List<OrderItem> getItems() {
         return items;
     }
 
     public void setItems(List<OrderItem> items) {
         this.items = items;
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
 
     public String getShippingFullName() {
         return shippingFullName;
     }
 
     public void setShippingFullName(String shippingFullName) {
         this.shippingFullName = shippingFullName;
     }
 
     public String getShippingPhone() {
         return shippingPhone;
     }
 
     public void setShippingPhone(String shippingPhone) {
         this.shippingPhone = shippingPhone;
     }
 
     public String getShippingProvince() {
         return shippingProvince;
     }
 
     public void setShippingProvince(String shippingProvince) {
         this.shippingProvince = shippingProvince;
     }
 
     public String getShippingWard() {
         return shippingWard;
     }
 
     public void setShippingWard(String shippingWard) {
         this.shippingWard = shippingWard;
     }
 
     public String getShippingAddressDetail() {
         return shippingAddressDetail;
     }
 
     public void setShippingAddressDetail(String shippingAddressDetail) {
         this.shippingAddressDetail = shippingAddressDetail;
     }
 
     public Long getPaymentId() {
         return paymentId;
     }
 
     public void setPaymentId(Long paymentId) {
         this.paymentId = paymentId;
     }
 
     public Instant getCreatedAt() {
         return createdAt;
     }
 
     public void setCreatedAt(Instant createdAt) {
         this.createdAt = createdAt;
     }
 
     public Instant getUpdatedAt() {
         return updatedAt;
     }
 
     public void setUpdatedAt(Instant updatedAt) {
         this.updatedAt = updatedAt;
     }
 }
