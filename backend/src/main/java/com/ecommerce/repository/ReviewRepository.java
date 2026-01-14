 package com.ecommerce.repository;
 
 import com.ecommerce.model.entity.Review;
 import java.util.List;
 import org.springframework.data.jpa.repository.JpaRepository;
 
 public interface ReviewRepository extends JpaRepository<Review, Long> {
     List<Review> findByProductId(Long productId);
 }
