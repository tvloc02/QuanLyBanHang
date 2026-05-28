 package com.ecommerce.repository;
 
 import com.ecommerce.model.entity.Review;
 import java.util.Optional;
 import java.util.List;
 import org.springframework.data.jpa.repository.JpaRepository;
 
 public interface ReviewRepository extends JpaRepository<Review, Long> {
     List<Review> findByProductId(Long productId);
     List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);
     Optional<Review> findByProductIdAndUserId(Long productId, Long userId);
 }
