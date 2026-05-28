package com.ecommerce.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminCouponResponse {

    private Long id;

    private String code;

    private String description;

    private String type;

    private BigDecimal discountAmount;

    private Integer discountPercent;

    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscountAmount;

    private BigDecimal shippingDiscountAmount;

    private String allowedSegments;

    private String targetUserIds;

    private Integer usageLimit;

    private Integer usedCount;

    private Instant startsAt;

    private Instant endsAt;

    private Boolean active;

    public AdminCouponResponse() {}

    public AdminCouponResponse(
        Long id,
        String code,
        String description,
        String type,
        BigDecimal discountAmount,
        Integer discountPercent,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        BigDecimal shippingDiscountAmount,
        String allowedSegments,
        String targetUserIds,
        Integer usageLimit,
        Integer usedCount,
        Instant startsAt,
        Instant endsAt,
        Boolean active
    ) {
        this.id = id;
        this.code = code;
        this.description = description;
        this.type = type;
        this.discountAmount = discountAmount;
        this.discountPercent = discountPercent;
        this.minOrderAmount = minOrderAmount;
        this.maxDiscountAmount = maxDiscountAmount;
        this.shippingDiscountAmount = shippingDiscountAmount;
        this.allowedSegments = allowedSegments;
        this.targetUserIds = targetUserIds;
        this.usageLimit = usageLimit;
        this.usedCount = usedCount;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public BigDecimal getDiscountAmount() {
        return discountAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public Integer getDiscountPercent() {
        return discountPercent;
    }

    public void setDiscountPercent(Integer discountPercent) {
        this.discountPercent = discountPercent;
    }

    public BigDecimal getMinOrderAmount() {
        return minOrderAmount;
    }

    public void setMinOrderAmount(BigDecimal minOrderAmount) {
        this.minOrderAmount = minOrderAmount;
    }

    public BigDecimal getMaxDiscountAmount() {
        return maxDiscountAmount;
    }

    public void setMaxDiscountAmount(BigDecimal maxDiscountAmount) {
        this.maxDiscountAmount = maxDiscountAmount;
    }

    public BigDecimal getShippingDiscountAmount() {
        return shippingDiscountAmount;
    }

    public void setShippingDiscountAmount(BigDecimal shippingDiscountAmount) {
        this.shippingDiscountAmount = shippingDiscountAmount;
    }

    public String getAllowedSegments() {
        return allowedSegments;
    }

    public void setAllowedSegments(String allowedSegments) {
        this.allowedSegments = allowedSegments;
    }

    public String getTargetUserIds() {
        return targetUserIds;
    }

    public void setTargetUserIds(String targetUserIds) {
        this.targetUserIds = targetUserIds;
    }

    public Integer getUsageLimit() {
        return usageLimit;
    }

    public void setUsageLimit(Integer usageLimit) {
        this.usageLimit = usageLimit;
    }

    public Integer getUsedCount() {
        return usedCount;
    }

    public void setUsedCount(Integer usedCount) {
        this.usedCount = usedCount;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public void setStartsAt(Instant startsAt) {
        this.startsAt = startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public void setEndsAt(Instant endsAt) {
        this.endsAt = endsAt;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
