 package com.ecommerce.model.entity;
 
 import jakarta.persistence.CollectionTable;
 import jakarta.persistence.Column;
 import jakarta.persistence.ElementCollection;
 import jakarta.persistence.Entity;
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
 @Table(name = "carts")
 public class Cart {
 
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;
 
     @Column(unique = true)
     private Long userId;
 
     @ElementCollection
     @CollectionTable(name = "cart_items", joinColumns = @JoinColumn(name = "cart_id"))
     private List<CartItem> items = new ArrayList<>();
 
     private BigDecimal subtotal;
 
     private BigDecimal discount;
 
     private BigDecimal total;
 
     private Instant lastUpdatedAt;
 
     private Instant createdAt;
 
     public Cart() {}
 
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
 
     public List<CartItem> getItems() {
         return items;
     }
 
     public void setItems(List<CartItem> items) {
         this.items = items;
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
 
     public BigDecimal getTotal() {
         return total;
     }
 
     public void setTotal(BigDecimal total) {
         this.total = total;
     }
 
     public Instant getLastUpdatedAt() {
         return lastUpdatedAt;
     }
 
     public void setLastUpdatedAt(Instant lastUpdatedAt) {
         this.lastUpdatedAt = lastUpdatedAt;
     }
 
     public Instant getCreatedAt() {
         return createdAt;
     }
 
     public void setCreatedAt(Instant createdAt) {
         this.createdAt = createdAt;
     }
 }
