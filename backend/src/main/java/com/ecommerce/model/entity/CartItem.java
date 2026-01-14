 package com.ecommerce.model.entity;
 
 import jakarta.persistence.Embeddable;
 import java.math.BigDecimal;
 
 @Embeddable
 public class CartItem {
 
     private String productId;
 
     private String productName;
 
     private Integer quantity;
 
     private BigDecimal unitPrice;
 
     private BigDecimal totalPrice;
 
     public CartItem() {}
 
     public String getProductId() {
         return productId;
     }
 
     public void setProductId(String productId) {
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
