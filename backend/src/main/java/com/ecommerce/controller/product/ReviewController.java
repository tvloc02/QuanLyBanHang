package com.ecommerce.controller.product;

import com.ecommerce.dto.request.ReviewUpsertRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.ReviewResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.exception.ForbiddenException;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.OrderItem;
import com.ecommerce.model.entity.Product;
import com.ecommerce.model.entity.Review;
import com.ecommerce.model.enums.OrderStatus;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ReviewRepository;
import com.ecommerce.security.SecurityUtils;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public ReviewController(
        ReviewRepository reviewRepository,
        ProductRepository productRepository,
        OrderRepository orderRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<ApiResponse<List<ReviewResponse>>> listByProduct(@PathVariable Long productId) {
        List<ReviewResponse> rows = reviewRepository.findByProductIdOrderByCreatedAtDesc(productId)
            .stream()
            .map(this::toResponse)
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(rows));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReviewResponse>> createOrUpdate(@RequestBody ReviewUpsertRequest req) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (req == null || req.getProductId() == null) {
            throw new BadRequestException("productId là bắt buộc");
        }
        if (req.getRating() == null || req.getRating() < 1 || req.getRating() > 5) {
            throw new BadRequestException("rating phải từ 1 đến 5");
        }

        Product product = productRepository.findById(req.getProductId())
            .orElseThrow(() -> new ResourceNotFoundException("Product not found"));

        boolean purchasedCompleted = orderRepository.findByUserId(userId).stream()
            .filter(order -> order != null && order.getStatus() == OrderStatus.COMPLETED)
            .anyMatch(order -> containsProduct(order, req.getProductId()));

        if (!purchasedCompleted) {
            throw new ForbiddenException("Bạn chỉ có thể đánh giá sản phẩm sau khi đã nhận hàng");
        }

        Instant now = Instant.now();
        Review review = reviewRepository.findByProductIdAndUserId(req.getProductId(), userId).orElseGet(Review::new);
        boolean isNew = review.getId() == null;
        if (isNew) {
            review.setProductId(req.getProductId());
            review.setUserId(userId);
            review.setCreatedAt(now);
        }
        review.setRating(req.getRating());
        review.setComment(req.getComment() == null ? null : req.getComment().trim());
        review.setImages(sanitizeImageUrls(req.getImages()));
        review.setUpdatedAt(now);
        Review saved = reviewRepository.save(review);

        updateProductRating(product);
        return ResponseEntity.ok(ApiResponse.ok(isNew ? "Đã gửi đánh giá" : "Đã cập nhật đánh giá", toResponse(saved)));
    }

    @PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadReviewImage(@RequestParam("file") MultipartFile file) {
        Long userId = SecurityUtils.currentUserId();
        if (userId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File trống");
        }

        try {
            Path uploadDir = Path.of("uploads");
            Files.createDirectories(uploadDir);

            String original = file.getOriginalFilename();
            String safe = (original == null || original.isBlank() ? "review-image" : original)
                .replaceAll("[^a-zA-Z0-9_.-]", "_");
            if (safe.length() > 80) {
                safe = safe.substring(safe.length() - 80);
            }
            if (!safe.contains(".")) {
                safe = safe + ".jpg";
            }

            String base = UUID.randomUUID().toString().replace("-", "");
            Path target = uploadDir.resolve(base + "_" + safe);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            String url = "/api/admin/uploads/" + target.getFileName().toString();
            Map<String, String> data = new HashMap<>();
            data.put("url", url);
            return ResponseEntity.ok(ApiResponse.ok(data));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Upload ảnh thất bại"));
        }
    }

    private boolean containsProduct(Order order, Long productId) {
        List<OrderItem> items = order.getItems() != null ? order.getItems() : List.of();
        for (OrderItem item : items) {
            if (item != null && productId.equals(item.getProductId())) {
                return true;
            }
        }
        return false;
    }

    private void updateProductRating(Product product) {
        List<Review> rows = reviewRepository.findByProductId(product.getId());
        if (rows.isEmpty()) {
            product.setRating(null);
            productRepository.save(product);
            return;
        }

        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        for (Review row : rows) {
            if (row == null || row.getRating() == null) continue;
            total = total.add(BigDecimal.valueOf(row.getRating()));
            count++;
        }
        if (count == 0) {
            product.setRating(null);
        } else {
            product.setRating(total.divide(BigDecimal.valueOf(count), 1, RoundingMode.HALF_UP));
        }
        productRepository.save(product);
    }

    private ReviewResponse toResponse(Review review) {
        ReviewResponse res = new ReviewResponse();
        res.setId(review.getId());
        res.setProductId(review.getProductId());
        res.setUserId(review.getUserId());
        res.setRating(review.getRating());
        res.setComment(review.getComment());
        res.setImages(review.getImages() != null ? review.getImages() : List.of());
        res.setCreatedAt(review.getCreatedAt());
        res.setUpdatedAt(review.getUpdatedAt());
        return res;
    }

    private List<String> sanitizeImageUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return List.of();
        }
        return urls.stream()
            .filter(url -> url != null && !url.isBlank())
            .map(String::trim)
            .filter(url -> url.startsWith("/api/admin/uploads/"))
            .distinct()
            .limit(5)
            .toList();
    }
}
