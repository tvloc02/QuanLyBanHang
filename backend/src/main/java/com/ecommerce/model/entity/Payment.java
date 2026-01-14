 package com.ecommerce.model.entity;
 
 import com.ecommerce.model.enums.PaymentMethod;
 import com.ecommerce.model.enums.PaymentStatus;
 import jakarta.persistence.Entity;
 import jakarta.persistence.EnumType;
 import jakarta.persistence.Enumerated;
 import jakarta.persistence.GeneratedValue;
 import jakarta.persistence.GenerationType;
 import jakarta.persistence.Id;
 import jakarta.persistence.Table;
 import java.math.BigDecimal;
 import java.time.Instant;
 
 @Entity
 @Table(name = "payments")
 public class Payment {
 
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;
 
     private Long orderId;
 
     private Long userId;
 
     @Enumerated(EnumType.STRING)
     private PaymentMethod method;
 
     @Enumerated(EnumType.STRING)
     private PaymentStatus status = PaymentStatus.PENDING;
 
     private BigDecimal amount;
 
     private String transactionId;
 
     private Instant paidAt;
 
     private Instant createdAt;
 
     public Payment() {}
 
     public Long getId() {
         return id;
     }
 
     public void setId(Long id) {
         this.id = id;
     }
 
     public Long getOrderId() {
         return orderId;
     }
 
     public void setOrderId(Long orderId) {
         this.orderId = orderId;
     }
 
     public Long getUserId() {
         return userId;
     }
 
     public void setUserId(Long userId) {
         this.userId = userId;
     }
 
     public PaymentMethod getMethod() {
         return method;
     }
 
     public void setMethod(PaymentMethod method) {
         this.method = method;
     }
 
     public PaymentStatus getStatus() {
         return status;
     }
 
     public void setStatus(PaymentStatus status) {
         this.status = status;
     }
 
     public BigDecimal getAmount() {
         return amount;
     }
 
     public void setAmount(BigDecimal amount) {
         this.amount = amount;
     }
 
     public String getTransactionId() {
         return transactionId;
     }
 
     public void setTransactionId(String transactionId) {
         this.transactionId = transactionId;
     }
 
     public Instant getPaidAt() {
         return paidAt;
     }
 
     public void setPaidAt(Instant paidAt) {
         this.paidAt = paidAt;
     }
 
     public Instant getCreatedAt() {
         return createdAt;
     }
 
     public void setCreatedAt(Instant createdAt) {
         this.createdAt = createdAt;
     }
 }
