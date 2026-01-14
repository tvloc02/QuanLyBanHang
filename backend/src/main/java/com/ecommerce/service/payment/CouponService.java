package com.ecommerce.service.payment;

import com.ecommerce.dto.response.CouponDto;
import com.ecommerce.dto.response.CouponPreviewResponse;
import com.ecommerce.dto.response.UserCouponDto;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Coupon;
import com.ecommerce.model.entity.UserCoupon;
import com.ecommerce.model.enums.UserCouponStatus;
import com.ecommerce.repository.CouponRepository;
import com.ecommerce.repository.UserCouponRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CouponService {

    private final CouponRepository couponRepository;
    private final UserCouponRepository userCouponRepository;

    public CouponService(CouponRepository couponRepository, UserCouponRepository userCouponRepository) {
        this.couponRepository = couponRepository;
        this.userCouponRepository = userCouponRepository;
    }

    public List<CouponDto> listCoupons() {
        return couponRepository.findAll().stream().map(CouponService::toDto).toList();
    }

    @Transactional
    public UserCouponDto claim(Long userId, String code) {
        Coupon coupon = couponRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));

        validateCouponActive(coupon);

        if (userCouponRepository.existsByUserIdAndCouponId(userId, coupon.getId())) {
            throw new BadRequestException("Coupon already claimed");
        }

        UserCoupon uc = new UserCoupon();
        uc.setUserId(userId);
        uc.setCouponId(coupon.getId());
        uc.setStatus(UserCouponStatus.CLAIMED);
        uc.setClaimedAt(Instant.now());
        UserCoupon saved = userCouponRepository.save(uc);

        return toUserCouponDto(saved, coupon);
    }

    public List<UserCouponDto> listUserCoupons(Long userId, UserCouponStatus status) {
        List<UserCoupon> list = status == null
                ? userCouponRepository.findByUserId(userId)
                : userCouponRepository.findByUserIdAndStatus(userId, status);

        return list.stream().map(uc -> {
            Coupon c = couponRepository.findById(uc.getCouponId())
                    .orElse(null);
            return toUserCouponDto(uc, c);
        }).toList();
    }

    public CouponPreviewResponse preview(Long userId, String couponCode, BigDecimal subtotal) {
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Invalid subtotal");
        }

        Coupon coupon = couponRepository.findByCode(couponCode)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));

        validateCouponActive(coupon);

        Optional<UserCoupon> ucOpt = userCouponRepository.findByUserIdAndCouponId(userId, coupon.getId());
        if (ucOpt.isEmpty() || ucOpt.get().getStatus() != UserCouponStatus.CLAIMED) {
            throw new BadRequestException("Coupon not available for this user");
        }

        BigDecimal discount = computeDiscount(coupon, subtotal);
        BigDecimal totalAfterDiscount = subtotal.subtract(discount);

        CouponPreviewResponse res = new CouponPreviewResponse();
        res.setCouponCode(couponCode);
        res.setSubtotal(subtotal);
        res.setDiscount(discount);
        res.setTotalAfterDiscount(totalAfterDiscount);
        return res;
    }

    @Transactional
    public BigDecimal applyToOrder(Long userId, String couponCode, BigDecimal subtotal, Long orderId) {
        if (orderId == null) {
            throw new BadRequestException("orderId is required");
        }

        Coupon coupon = couponRepository.findByCode(couponCode)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));

        validateCouponActive(coupon);

        UserCoupon uc = userCouponRepository.findByUserIdAndCouponId(userId, coupon.getId())
                .orElseThrow(() -> new BadRequestException("Coupon not available for this user"));

        if (uc.getStatus() != UserCouponStatus.CLAIMED) {
            throw new BadRequestException("Coupon is not in claimed status");
        }

        BigDecimal discount = computeDiscount(coupon, subtotal);

        uc.setStatus(UserCouponStatus.USED);
        uc.setUsedAt(Instant.now());
        uc.setUsedOrderId(orderId);
        userCouponRepository.save(uc);

        int used = coupon.getUsedCount() == null ? 0 : coupon.getUsedCount();
        coupon.setUsedCount(used + 1);
        couponRepository.save(coupon);

        return discount;
    }

    private static void validateCouponActive(Coupon coupon) {
        if (coupon.getActive() != null && !coupon.getActive()) {
            throw new BadRequestException("Coupon is inactive");
        }
        Instant now = Instant.now();
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            throw new BadRequestException("Coupon is not started yet");
        }
        if (coupon.getEndsAt() != null && now.isAfter(coupon.getEndsAt())) {
            throw new BadRequestException("Coupon is expired");
        }
        if (coupon.getUsageLimit() != null) {
            int used = coupon.getUsedCount() == null ? 0 : coupon.getUsedCount();
            if (used >= coupon.getUsageLimit()) {
                throw new BadRequestException("Coupon usage limit reached");
            }
        }
    }

    private static BigDecimal computeDiscount(Coupon coupon, BigDecimal subtotal) {
        if (coupon.getMinOrderAmount() != null && subtotal.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new BadRequestException("Order does not meet minimum amount");
        }

        BigDecimal discount = BigDecimal.ZERO;
        if (coupon.getDiscountAmount() != null) {
            discount = coupon.getDiscountAmount();
        } else if (coupon.getDiscountPercent() != null && coupon.getDiscountPercent() > 0) {
            discount = subtotal
                    .multiply(BigDecimal.valueOf(coupon.getDiscountPercent()))
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        if (coupon.getMaxDiscountAmount() != null && discount.compareTo(coupon.getMaxDiscountAmount()) > 0) {
            discount = coupon.getMaxDiscountAmount();
        }

        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            discount = BigDecimal.ZERO;
        }
        if (discount.compareTo(subtotal) > 0) {
            discount = subtotal;
        }
        return discount;
    }

    private static CouponDto toDto(Coupon c) {
        CouponDto dto = new CouponDto();
        dto.setId(c.getId());
        dto.setCode(c.getCode());
        dto.setDescription(c.getDescription());
        dto.setDiscountAmount(c.getDiscountAmount());
        dto.setDiscountPercent(c.getDiscountPercent());
        dto.setMinOrderAmount(c.getMinOrderAmount());
        dto.setMaxDiscountAmount(c.getMaxDiscountAmount());
        dto.setUsageLimit(c.getUsageLimit());
        dto.setUsedCount(c.getUsedCount());
        dto.setStartsAt(c.getStartsAt());
        dto.setEndsAt(c.getEndsAt());
        dto.setActive(c.getActive());
        return dto;
    }

    private static UserCouponDto toUserCouponDto(UserCoupon uc, Coupon c) {
        UserCouponDto dto = new UserCouponDto();
        dto.setId(uc.getId());
        dto.setUserId(uc.getUserId());
        dto.setStatus(uc.getStatus());
        dto.setClaimedAt(uc.getClaimedAt());
        dto.setUsedAt(uc.getUsedAt());
        dto.setUsedOrderId(uc.getUsedOrderId());
        if (c != null) {
            dto.setCoupon(toDto(c));
        }
        return dto;
    }
}
