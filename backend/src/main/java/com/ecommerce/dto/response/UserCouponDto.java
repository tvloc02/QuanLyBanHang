package com.ecommerce.dto.response;

import com.ecommerce.model.enums.UserCouponStatus;
import java.time.Instant;

public class UserCouponDto {

    private Long id;

    private Long userId;

    private UserCouponStatus status;

    private Instant claimedAt;

    private Instant usedAt;

    private Long usedOrderId;

    private CouponDto coupon;

    public UserCouponDto() {}

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

    public UserCouponStatus getStatus() {
        return status;
    }

    public void setStatus(UserCouponStatus status) {
        this.status = status;
    }

    public Instant getClaimedAt() {
        return claimedAt;
    }

    public void setClaimedAt(Instant claimedAt) {
        this.claimedAt = claimedAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }

    public Long getUsedOrderId() {
        return usedOrderId;
    }

    public void setUsedOrderId(Long usedOrderId) {
        this.usedOrderId = usedOrderId;
    }

    public CouponDto getCoupon() {
        return coupon;
    }

    public void setCoupon(CouponDto coupon) {
        this.coupon = coupon;
    }
}
