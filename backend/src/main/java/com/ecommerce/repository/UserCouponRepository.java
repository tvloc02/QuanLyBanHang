package com.ecommerce.repository;

import com.ecommerce.model.entity.UserCoupon;
import com.ecommerce.model.enums.UserCouponStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCouponRepository extends JpaRepository<UserCoupon, Long> {
    boolean existsByUserIdAndCouponId(Long userId, Long couponId);

    Optional<UserCoupon> findByUserIdAndCouponId(Long userId, Long couponId);

    List<UserCoupon> findByUserId(Long userId);

    List<UserCoupon> findByUserIdAndStatus(Long userId, UserCouponStatus status);
}
