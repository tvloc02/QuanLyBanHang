 package com.ecommerce.repository;
 
 import com.ecommerce.model.entity.Order;
 import java.util.List;
 import org.springframework.data.jpa.repository.JpaRepository;
 
 public interface OrderRepository extends JpaRepository<Order, Long> {
     List<Order> findByUserId(Long userId);
 }
