package com.ecommerce.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public class AdminCouponResponse {

    private Long id;

    private String code;

    private String description;

    private BigDecimal discountAmount;

    private Integer discountPercent;

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
        BigDecimal discountAmount,
        Integer discountPercent,
        Integer usageLimit,
        Integer usedCount,
        Instant startsAt,
        Instant endsAt,
        Boolean active
    ) {
        this.id = id;
        this.code = code;
        this.description = description;
        this.discountAmount = discountAmount;
        this.discountPercent = discountPercent;
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
