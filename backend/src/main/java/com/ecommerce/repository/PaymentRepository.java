 package com.ecommerce.repository;

import com.ecommerce.model.entity.Payment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByOrderId(Long orderId);

    List<Payment> findByUserId(Long userId);
}
