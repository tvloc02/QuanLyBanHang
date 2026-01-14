 package com.ecommerce.controller.payment;
 
 import com.ecommerce.dto.request.CouponPreviewRequest;
 import com.ecommerce.dto.response.ApiResponse;
 import com.ecommerce.dto.response.CouponDto;
 import com.ecommerce.dto.response.CouponPreviewResponse;
 import com.ecommerce.dto.response.UserCouponDto;
 import com.ecommerce.model.enums.UserCouponStatus;
 import com.ecommerce.service.payment.CouponService;
 import jakarta.validation.Valid;
 import java.util.List;
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.PathVariable;
 import org.springframework.web.bind.annotation.PostMapping;
 import org.springframework.web.bind.annotation.RequestBody;
 import org.springframework.web.bind.annotation.RequestParam;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/coupons")
 public class CouponController {
 
     private final CouponService couponService;

     public CouponController(CouponService couponService) {
         this.couponService = couponService;
     }

     @GetMapping
     public ResponseEntity<ApiResponse<List<CouponDto>>> list() {
         return ResponseEntity.ok(ApiResponse.ok(couponService.listCoupons()));
     }

     @PostMapping("/{code}/claim")
     public ResponseEntity<ApiResponse<UserCouponDto>> claim(
             @PathVariable String code,
             @RequestParam Long userId
     ) {
         return ResponseEntity.ok(ApiResponse.ok(couponService.claim(userId, code)));
     }

     @GetMapping("/user")
     public ResponseEntity<ApiResponse<List<UserCouponDto>>> listUserCoupons(
             @RequestParam Long userId,
             @RequestParam(required = false) UserCouponStatus status
     ) {
         return ResponseEntity.ok(ApiResponse.ok(couponService.listUserCoupons(userId, status)));
     }

     @PostMapping("/preview")
     public ResponseEntity<ApiResponse<CouponPreviewResponse>> preview(@Valid @RequestBody CouponPreviewRequest req) {
         CouponPreviewResponse res = couponService.preview(req.getUserId(), req.getCouponCode(), req.getSubtotal());
         return ResponseEntity.ok(ApiResponse.ok(res));
     }
 }
