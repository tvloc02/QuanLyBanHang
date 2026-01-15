package com.ecommerce.controller.admin;

import com.ecommerce.dto.response.AdminCategoryResponse;
import com.ecommerce.dto.request.AdminCategoryCreateRequest;
import com.ecommerce.dto.request.AdminUserCreateRequest;
import com.ecommerce.dto.response.AdminCouponResponse;
import com.ecommerce.dto.response.AdminOrderSummaryResponse;
import com.ecommerce.dto.response.AdminReviewResponse;
import com.ecommerce.dto.response.AdminUserResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.Category;
import com.ecommerce.model.entity.Coupon;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.Review;
import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.CouponRepository;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ReviewRepository;
import com.ecommerce.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminDataController {

    private final OrderRepository orderRepository;

    private final CategoryRepository categoryRepository;

    private final CouponRepository couponRepository;

    private final UserRepository userRepository;

    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDataController(
        OrderRepository orderRepository,
        CategoryRepository categoryRepository,
        CouponRepository couponRepository,
        UserRepository userRepository,
        ReviewRepository reviewRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.orderRepository = orderRepository;
        this.categoryRepository = categoryRepository;
        this.couponRepository = couponRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<AdminOrderSummaryResponse>>> orders() {
        List<Order> orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<AdminOrderSummaryResponse> result = orders
            .stream()
            .map(o -> new AdminOrderSummaryResponse(
                o.getId(),
                o.getUserId(),
                o.getStatus() != null ? o.getStatus().name() : null,
                o.getTotal(),
                o.getItems() != null ? o.getItems().size() : 0,
                o.getCouponCode(),
                o.getCreatedAt()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<AdminCategoryResponse>> createCategory(
        @RequestBody AdminCategoryCreateRequest req
    ) {
        if (req == null || req.getName() == null || req.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Tên danh mục là bắt buộc"));
        }
        Category c = new Category();
        c.setName(req.getName().trim());
        c.setDescription(req.getDescription());
        c.setActive(req.getActive() != null ? req.getActive() : Boolean.TRUE);
        Category saved = categoryRepository.save(c);
        AdminCategoryResponse res = new AdminCategoryResponse(
            saved.getId(),
            saved.getName(),
            saved.getDescription(),
            saved.getActive(),
            saved.getCreatedAt()
        );
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<AdminCategoryResponse>> updateCategory(
        @PathVariable("id") Long id,
        @RequestBody AdminCategoryCreateRequest req
    ) {
        if (req == null || req.getName() == null || req.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Tên danh mục là bắt buộc"));
        }
        return categoryRepository.findById(id)
            .map(c -> {
                c.setName(req.getName().trim());
                c.setDescription(req.getDescription());
                c.setActive(req.getActive() != null ? req.getActive() : c.getActive());
                Category saved = categoryRepository.save(c);
                AdminCategoryResponse res = new AdminCategoryResponse(
                    saved.getId(),
                    saved.getName(),
                    saved.getDescription(),
                    saved.getActive(),
                    saved.getCreatedAt()
                );
                return ResponseEntity.ok(ApiResponse.ok(res));
            })
            .orElseGet(() -> ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy danh mục")));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCategory(@PathVariable("id") Long id) {
        var opt = categoryRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy danh mục"));
        }
        try {
            categoryRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Đã xóa danh mục"));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không thể xóa danh mục do ràng buộc dữ liệu: " + msg));
        }
    }

    @PostMapping(path = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> uploadImage(
        @RequestParam("file") MultipartFile file
    ) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("File trống"));
            }
            String contentType = file.getContentType() != null ? file.getContentType() : "";
            if (!contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chỉ hỗ trợ upload ảnh"));
            }
            String ext = switch (contentType) {
                case "image/png" -> ".png";
                case "image/jpeg" -> ".jpg";
                case "image/jpg" -> ".jpg";
                case "image/webp" -> ".webp";
                default -> "";
            };
            if (ext.isEmpty()) {
                ext = ""; // fallback keep original if possible
            }

            Path uploadDir = Path.of("uploads");
            Files.createDirectories(uploadDir);
            String base = java.util.UUID.randomUUID().toString().replace("-", "");
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : base + ext;
            String safeName = originalName.replaceAll("[^a-zA-Z0-9_.-]", "_");
            if (!safeName.contains(".")) safeName = safeName + ext;
            Path target = uploadDir.resolve(base + "_" + safeName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

            String url = "/api/admin/uploads/" + target.getFileName().toString();
            return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Upload thất bại: " + e.getMessage()));
        }
    }

    @GetMapping("/uploads/{filename}")
    public ResponseEntity<Resource> getUploaded(@PathVariable("filename") String filename) {
        try {
            Path p = Path.of("uploads").resolve(filename).normalize();
            if (!Files.exists(p)) {
                return ResponseEntity.notFound().build();
            }
            byte[] bytes = Files.readAllBytes(p);
            String probe = Files.probeContentType(p);
            MediaType mt = probe != null ? MediaType.parseMediaType(probe) : MediaType.APPLICATION_OCTET_STREAM;
            return ResponseEntity.ok()
                .contentType(mt)
                .body(new ByteArrayResource(bytes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUser(
        @PathVariable("id") Long id,
        @RequestBody AdminUserCreateRequest req
    ) {
        var opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy người dùng"));
        }
        User u = opt.get();
        // Uniqueness checks excluding current user
        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            String email = req.getEmail().trim();
            var existing = userRepository.findByEmail(email);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Email đã tồn tại"));
            }
            u.setEmail(email);
        }
        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            String username = req.getUsername().trim();
            var existing = userRepository.findByUsername(username);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Username đã tồn tại"));
            }
            u.setUsername(username);
        }
        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            String phone = req.getPhone().trim();
            var existing = userRepository.findByPhone(phone);
            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Số điện thoại đã tồn tại"));
            }
            u.setPhone(phone);
        }

        if (req.getFullName() != null) u.setFullName(req.getFullName());
        if (req.getEnabled() != null) u.setEnabled(req.getEnabled());

        if (req.getRoles() != null) {
            java.util.Set<com.ecommerce.model.enums.UserRole> roles = new java.util.HashSet<>();
            for (String r : req.getRoles()) {
                if (r == null) continue;
                String key = r.trim().toUpperCase();
                switch (key) {
                    case "ADMIN" -> roles.add(UserRole.ADMIN);
                    case "STAFF" -> roles.add(UserRole.STAFF);
                    case "CUSTOMER", "USER" -> roles.add(UserRole.CUSTOMER);
                    default -> {}
                }
            }
            if (!roles.isEmpty()) u.setRoles(roles);
        }

        u.setUpdatedAt(Instant.now());
        try {
            User saved = userRepository.save(u);
            Set<String> roleStrings = saved.getRoles() == null ? Set.of() : saved.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
            AdminUserResponse res = new AdminUserResponse(
                saved.getId(),
                saved.getFullName(),
                saved.getEmail(),
                saved.getUsername(),
                saved.getPhone(),
                roleStrings,
                saved.getEnabled(),
                saved.getCreatedAt()
            );
            return ResponseEntity.ok(ApiResponse.ok(res));
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable("id") Long id) {
        return userRepository.findById(id)
            .map(u -> {
                userRepository.deleteById(id);
                return ResponseEntity.ok(ApiResponse.ok("Đã xóa người dùng"));
            })
            .orElseGet(() -> ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy người dùng")));
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<ApiResponse<String>> resetPassword(@PathVariable("id") Long id) {
        return userRepository.findById(id)
            .map(u -> {
                // Tạo mật khẩu tạm, ở đây đặt mặc định "12345678" (có thể đổi theo yêu cầu)
                String temp = "12345678";
                u.setPassword(passwordEncoder.encode(temp));
                u.setUpdatedAt(Instant.now());
                userRepository.save(u);
                return ResponseEntity.ok(ApiResponse.ok("Đặt lại mật khẩu thành công"));
            })
            .orElseGet(() -> ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy người dùng")));
    }

    @PutMapping("/users/{id}/enabled")
    public ResponseEntity<ApiResponse<AdminUserResponse>> setEnabled(
        @PathVariable("id") Long id,
        @RequestBody java.util.Map<String, Object> body
    ) {
        Boolean enabled = null;
        if (body != null && body.containsKey("enabled")) {
            Object v = body.get("enabled");
            if (v instanceof Boolean b) {
                enabled = b;
            }
        }
        if (enabled == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu tham số enabled"));
        }
        final Boolean newEnabled = enabled;
        return userRepository.findById(id)
            .map(u -> {
                u.setEnabled(newEnabled);
                u.setUpdatedAt(Instant.now());
                User saved = userRepository.save(u);
                Set<String> roleStrings = saved.getRoles() == null ? Set.of() : saved.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
                AdminUserResponse res = new AdminUserResponse(
                    saved.getId(),
                    saved.getFullName(),
                    saved.getEmail(),
                    saved.getUsername(),
                    saved.getPhone(),
                    roleStrings,
                    saved.getEnabled(),
                    saved.getCreatedAt()
                );
                return ResponseEntity.ok(ApiResponse.ok(res));
            })
            .orElseGet(() -> ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy người dùng")));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<AdminCategoryResponse>>> categories() {
        List<Category> categories = categoryRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        List<AdminCategoryResponse> result = categories
            .stream()
            .map(c -> new AdminCategoryResponse(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getActive(),
                c.getCreatedAt()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/coupons")
    public ResponseEntity<ApiResponse<List<AdminCouponResponse>>> coupons() {
        List<Coupon> coupons = couponRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        List<AdminCouponResponse> result = coupons
            .stream()
            .map(c -> new AdminCouponResponse(
                c.getId(),
                c.getCode(),
                c.getDescription(),
                c.getDiscountAmount(),
                c.getDiscountPercent(),
                c.getUsageLimit(),
                c.getUsedCount(),
                c.getStartsAt(),
                c.getEndsAt(),
                c.getActive()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> users() {
        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        List<AdminUserResponse> result = users
            .stream()
            .map(u -> {
                Set<String> roles = u.getRoles() == null
                    ? Set.of()
                    : u.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
                return new AdminUserResponse(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    u.getUsername(),
                    u.getPhone(),
                    roles,
                    u.getEnabled(),
                    u.getCreatedAt()
                );
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<AdminUserResponse>> createUser(
        @RequestBody AdminUserCreateRequest req
    ) {
        if (req == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Dữ liệu không hợp lệ"));
        }

        // Validate uniqueness when fields are provided
        if (req.getEmail() != null && !req.getEmail().isBlank() && userRepository.findByEmail(req.getEmail().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Email đã tồn tại"));
        }
        if (req.getUsername() != null && !req.getUsername().isBlank() && userRepository.findByUsername(req.getUsername().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Username đã tồn tại"));
        }
        if (req.getPhone() != null && !req.getPhone().isBlank() && userRepository.findByPhone(req.getPhone().trim()).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Số điện thoại đã tồn tại"));
        }

        Instant now = Instant.now();
        User u = new User();
        u.setFullName(req.getFullName());
        u.setEmail(req.getEmail());
        u.setUsername(req.getUsername());
        u.setPhone(req.getPhone());
        u.setEnabled(req.getEnabled() != null ? req.getEnabled() : Boolean.TRUE);
        u.setCreatedAt(now);
        u.setUpdatedAt(now);

        // Map roles from strings, accept alias USER -> CUSTOMER
        Set<UserRole> roles = new HashSet<>();
        if (req.getRoles() != null) {
            for (String r : req.getRoles()) {
                if (r == null) continue;
                String key = r.trim().toUpperCase();
                switch (key) {
                    case "ADMIN" -> roles.add(UserRole.ADMIN);
                    case "STAFF" -> roles.add(UserRole.STAFF);
                    case "CUSTOMER", "USER" -> roles.add(UserRole.CUSTOMER);
                    default -> {
                        // ignore unknown role strings
                    }
                }
            }
        }
        if (roles.isEmpty()) {
            roles.add(UserRole.CUSTOMER);
        }
        u.setRoles(roles);

        User saved;
        try {
            saved = userRepository.save(u);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }
        Set<String> roleStrings = saved.getRoles() == null
            ? Set.of()
            : saved.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
        AdminUserResponse res = new AdminUserResponse(
            saved.getId(),
            saved.getFullName(),
            saved.getEmail(),
            saved.getUsername(),
            saved.getPhone(),
            roleStrings,
            saved.getEnabled(),
            saved.getCreatedAt()
        );
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @GetMapping("/reviews")
    public ResponseEntity<ApiResponse<List<AdminReviewResponse>>> reviews() {
        List<Review> reviews = reviewRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<AdminReviewResponse> result = reviews
            .stream()
            .map(r -> new AdminReviewResponse(
                r.getId(),
                r.getProductId(),
                r.getUserId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }
}
