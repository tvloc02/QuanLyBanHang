 package com.ecommerce.repository;

import com.ecommerce.model.entity.Order;
import com.ecommerce.model.enums.OrderStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);

    List<Order> findByStatusAndCreatedAtAfter(OrderStatus status, Instant after);

    List<Order> findByUserIdAndStatusAndCreatedAtAfter(Long userId, OrderStatus status, Instant after);
}
