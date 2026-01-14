 package com.ecommerce.model.entity;
 
 import jakarta.persistence.Entity;
 import jakarta.persistence.GeneratedValue;
 import jakarta.persistence.GenerationType;
 import jakarta.persistence.Id;
 import jakarta.persistence.Table;
 import java.time.Instant;
 
 @Entity
 @Table(name = "reviews")
 public class Review {
 
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;
 
     private Long productId;
 
     private Long userId;
 
     private Integer rating;
 
     private String comment;
 
     private Instant createdAt;
 
     private Instant updatedAt;
 
     public Review() {}
 
     public Long getId() {
         return id;
     }
 
     public void setId(Long id) {
         this.id = id;
     }
 
     public Long getProductId() {
         return productId;
     }
 
     public void setProductId(Long productId) {
         this.productId = productId;
     }
 
     public Long getUserId() {
         return userId;
     }
 
     public void setUserId(Long userId) {
         this.userId = userId;
     }
 
     public Integer getRating() {
         return rating;
     }
 
     public void setRating(Integer rating) {
         this.rating = rating;
     }
 
     public String getComment() {
         return comment;
     }
 
     public void setComment(String comment) {
         this.comment = comment;
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
