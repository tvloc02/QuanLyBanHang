 package com.ecommerce.controller.admin;

import com.ecommerce.dto.response.AdminStatsResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.CouponRepository;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ReviewRepository;
import com.ecommerce.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class ManagementController {

    private final UserRepository userRepository;

    private final ProductRepository productRepository;

    private final CategoryRepository categoryRepository;

    private final OrderRepository orderRepository;

    private final CouponRepository couponRepository;

    private final ReviewRepository reviewRepository;

    public ManagementController(
        UserRepository userRepository,
        ProductRepository productRepository,
        CategoryRepository categoryRepository,
        OrderRepository orderRepository,
        CouponRepository couponRepository,
        ReviewRepository reviewRepository
    ) {
        this.userRepository = userRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.orderRepository = orderRepository;
        this.couponRepository = couponRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> stats() {
        AdminStatsResponse stats = new AdminStatsResponse(
            userRepository.count(),
            productRepository.count(),
            categoryRepository.count(),
            orderRepository.count(),
            couponRepository.count(),
            reviewRepository.count()
        );
        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
