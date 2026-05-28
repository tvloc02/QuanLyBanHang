 package com.ecommerce.controller.payment;

import com.ecommerce.dto.request.CouponPreviewRequest;
import com.ecommerce.dto.response.AdminProductImportResult;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.CouponDto;
import com.ecommerce.dto.response.CouponPreviewResponse;
import com.ecommerce.dto.response.UserCouponDto;
import com.ecommerce.exception.ForbiddenException;
import com.ecommerce.model.enums.UserCouponStatus;
import com.ecommerce.security.SecurityUtils;
import com.ecommerce.service.payment.AdminCouponImportExportService;
import com.ecommerce.service.payment.CouponService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;
    private final AdminCouponImportExportService couponImportExportService;

    public CouponController(CouponService couponService, AdminCouponImportExportService couponImportExportService) {
        this.couponService = couponService;
        this.couponImportExportService = couponImportExportService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CouponDto>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(couponService.listCoupons()));
    }

    @GetMapping("/admin/template")
    public ResponseEntity<byte[]> downloadTemplate() throws Exception {
        byte[] bytes = couponImportExportService.exportTemplate();
        return ResponseEntity.ok()
            .header("Content-Disposition", "attachment; filename=coupons_template.xlsx")
            .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            .body(bytes);
    }

    @PostMapping("/admin/import")
    public ResponseEntity<ApiResponse<AdminProductImportResult>> importCoupons(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok(couponImportExportService.importCoupons(file)));
    }

    @PostMapping("/{code}/claim")
    public ResponseEntity<ApiResponse<UserCouponDto>> claim(
            @PathVariable String code,
            @RequestParam Long userId
    ) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (!SecurityUtils.isInternalUser() && userId != null && !currentUserId.equals(userId)) {
            throw new ForbiddenException("Forbidden");
        }
        return ResponseEntity.ok(ApiResponse.ok(couponService.claim(userId, code)));
    }

    @GetMapping("/user")
    public ResponseEntity<ApiResponse<List<UserCouponDto>>> listUserCoupons(
            @RequestParam Long userId,
            @RequestParam(required = false) UserCouponStatus status
    ) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }

        if (!SecurityUtils.isInternalUser() && userId != null && !currentUserId.equals(userId)) {
            throw new ForbiddenException("Forbidden");
        }
        return ResponseEntity.ok(ApiResponse.ok(couponService.listUserCoupons(userId, status)));
    }

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<CouponPreviewResponse>> preview(@Valid @RequestBody CouponPreviewRequest req) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (req == null) {
            throw new ForbiddenException("Forbidden");
        }
        if (!SecurityUtils.isInternalUser() && req.getUserId() != null && !currentUserId.equals(req.getUserId())) {
            throw new ForbiddenException("Forbidden");
        }
        CouponPreviewResponse res = couponService.preview(req.getUserId(), req.getCouponCode(), req.getSubtotal());
        return ResponseEntity.ok(ApiResponse.ok(res));
    }
}
