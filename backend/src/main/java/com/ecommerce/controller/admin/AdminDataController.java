package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminCategoryCreateRequest;
import com.ecommerce.dto.request.AdminCouponUpsertRequest;
import com.ecommerce.dto.request.AdminUserCreateRequest;
import com.ecommerce.dto.response.AdminCategoryResponse;
import com.ecommerce.dto.response.AdminCouponResponse;
import com.ecommerce.dto.response.AdminOrderSummaryResponse;
import com.ecommerce.dto.response.AdminReviewResponse;
import com.ecommerce.dto.response.AdminUserResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.model.entity.Category;
import com.ecommerce.model.entity.Coupon;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.Review;
import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.model.enums.OrderStatus;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.CouponRepository;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.ReviewRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneOffset;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.util.Locale;

@RestController
@RequestMapping("/api/admin")
public class AdminDataController {

    private final OrderRepository orderRepository;

    private final CategoryRepository categoryRepository;

    private final CouponRepository couponRepository;

    private final BranchRepository branchRepository;

    private final UserRepository userRepository;

    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminDataController(
        OrderRepository orderRepository,
        CategoryRepository categoryRepository,
        CouponRepository couponRepository,
        BranchRepository branchRepository,
        UserRepository userRepository,
        ReviewRepository reviewRepository,
        PasswordEncoder passwordEncoder
    ) {
        this.orderRepository = orderRepository;
        this.categoryRepository = categoryRepository;
        this.couponRepository = couponRepository;
        this.branchRepository = branchRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping(path = "/categories/parse-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> parseCategoriesExcel(
        @RequestParam("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("File trống"));
        }

        try (InputStream is = file.getInputStream(); Workbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy sheet trong file"));
            }

            Map<String, Map<String, Object>> lv2BySlug = new HashMap<>();

            for (int i = sheet.getFirstRowNum(); i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String lv2Name = cellString(row.getCell(0));
                String lv2Slug = cellString(row.getCell(1));
                String lv3Name = cellString(row.getCell(2));
                String lv3Slug = cellString(row.getCell(3));

                // Optional header auto-skip
                if (i == sheet.getFirstRowNum()) {
                    String h = (lv2Name + " " + lv3Name).toLowerCase(Locale.ROOT);
                    if (h.contains("lv2") || h.contains("cap") || h.contains("name")) {
                        continue;
                    }
                }

                if (lv2Name == null || lv2Name.isBlank()) {
                    continue;
                }

                String normLv2Slug = normalizeSlug(lv2Slug, lv2Name);
                Map<String, Object> lv2Node = lv2BySlug.get(normLv2Slug);
                if (lv2Node == null) {
                    lv2Node = new HashMap<>();
                    lv2Node.put("name", lv2Name.trim());
                    lv2Node.put("slug", normLv2Slug);
                    lv2Node.put("lv3", new ArrayList<Map<String, String>>());
                    lv2BySlug.put(normLv2Slug, lv2Node);
                }

                if (lv3Name != null && !lv3Name.isBlank()) {
                    String normLv3Slug = normalizeSlug(lv3Slug, lv3Name);
                    @SuppressWarnings("unchecked")
                    List<Map<String, String>> lv3List = (List<Map<String, String>>) lv2Node.get("lv3");
                    boolean exists = false;
                    for (Map<String, String> x : lv3List) {
                        if (x == null) continue;
                        if (java.util.Objects.equals(x.get("slug"), normLv3Slug)) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        lv3List.add(Map.of(
                            "name", lv3Name.trim(),
                            "slug", normLv3Slug
                        ));
                    }
                }
            }

            List<Map<String, Object>> out = new ArrayList<>(lv2BySlug.values());
            out.sort((a, b) -> String.valueOf(a.get("name")).compareToIgnoreCase(String.valueOf(b.get("name"))));
            return ResponseEntity.ok(ApiResponse.ok(out));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không thể đọc file: " + e.getMessage()));
        }
    }

    public static class AdminCategoryExcelNode {
        private String name;
        private String slug;
        private List<AdminCategoryExcelNode> lv3;

        public AdminCategoryExcelNode() {}

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getSlug() {
            return slug;
        }

        public void setSlug(String slug) {
            this.slug = slug;
        }

        public List<AdminCategoryExcelNode> getLv3() {
            return lv3;
        }

        public void setLv3(List<AdminCategoryExcelNode> lv3) {
            this.lv3 = lv3;
        }
    }

    @PostMapping(path = "/categories/build-excel")
    public ResponseEntity<Resource> buildCategoriesExcel(
        @RequestBody List<AdminCategoryExcelNode> nodes
    ) {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Categories");
            Row h = sheet.createRow(0);
            h.createCell(0).setCellValue("lv2_name");
            h.createCell(1).setCellValue("lv2_slug");
            h.createCell(2).setCellValue("lv3_name");
            h.createCell(3).setCellValue("lv3_slug");

            int rowIdx = 1;
            List<AdminCategoryExcelNode> safe = nodes != null ? nodes : List.of();
            for (AdminCategoryExcelNode lv2 : safe) {
                if (lv2 == null || lv2.getName() == null || lv2.getName().trim().isEmpty()) continue;
                String lv2Name = lv2.getName().trim();
                String lv2Slug = normalizeSlug(lv2.getSlug(), lv2Name);

                List<AdminCategoryExcelNode> lv3s = lv2.getLv3() != null ? lv2.getLv3() : List.of();
                if (lv3s.isEmpty()) {
                    Row r = sheet.createRow(rowIdx++);
                    r.createCell(0).setCellValue(lv2Name);
                    r.createCell(1).setCellValue(lv2Slug);
                    continue;
                }
                for (AdminCategoryExcelNode lv3 : lv3s) {
                    if (lv3 == null || lv3.getName() == null || lv3.getName().trim().isEmpty()) continue;
                    String lv3Name = lv3.getName().trim();
                    String lv3Slug = normalizeSlug(lv3.getSlug(), lv3Name);

                    Row r = sheet.createRow(rowIdx++);
                    r.createCell(0).setCellValue(lv2Name);
                    r.createCell(1).setCellValue(lv2Slug);
                    r.createCell(2).setCellValue(lv3Name);
                    r.createCell(3).setCellValue(lv3Slug);
                }
            }

            for (int c = 0; c < 4; c++) sheet.autoSizeColumn(c);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            byte[] bytes = baos.toByteArray();

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header("Content-Disposition", "attachment; filename=categories_build.xlsx")
                .body(new ByteArrayResource(bytes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/categories/import-template-excel")
    public ResponseEntity<Resource> downloadCategoryImportTemplate() {
        try (Workbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Categories");
            Row h = sheet.createRow(0);
            h.createCell(0).setCellValue("lv2_name");
            h.createCell(1).setCellValue("lv2_slug");
            h.createCell(2).setCellValue("lv3_name");
            h.createCell(3).setCellValue("lv3_slug");

            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("Áo");
            r1.createCell(1).setCellValue("ao");
            r1.createCell(2).setCellValue("Áo sơ mi");
            r1.createCell(3).setCellValue("ao-so-mi");

            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Áo");
            r2.createCell(2).setCellValue("Áo thun");

            for (int c = 0; c < 4; c++) sheet.autoSizeColumn(c);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);
            byte[] bytes = baos.toByteArray();

            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header("Content-Disposition", "attachment; filename=categories_template.xlsx")
                .body(new ByteArrayResource(bytes));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/categories/export-excel")
    public ResponseEntity<Resource> exportCategoriesExcel(@RequestParam("rootId") Long rootId) {
        try {
            if (rootId == null) {
                return ResponseEntity.badRequest().build();
            }
            Category root = categoryRepository.findById(rootId).orElse(null);
            if (root == null || root.getParentId() != null) {
                return ResponseEntity.badRequest().build();
            }

            List<Category> all = categoryRepository.findAll();
            Map<Long, List<Category>> byParent = new HashMap<>();
            for (Category c : all) {
                Long pid = c.getParentId();
                byParent.computeIfAbsent(pid, k -> new ArrayList<>()).add(c);
            }
            List<Category> lv2 = byParent.getOrDefault(rootId, List.of());
            for (List<Category> list : byParent.values()) {
                list.sort((a, b) -> String.valueOf(a.getName()).compareToIgnoreCase(String.valueOf(b.getName())));
            }

            try (Workbook wb = new XSSFWorkbook()) {
                Sheet sheet = wb.createSheet("Categories");
                Row h = sheet.createRow(0);
                h.createCell(0).setCellValue("lv2_name");
                h.createCell(1).setCellValue("lv2_slug");
                h.createCell(2).setCellValue("lv3_name");
                h.createCell(3).setCellValue("lv3_slug");

                int rowIdx = 1;
                for (Category c2 : lv2) {
                    List<Category> lv3 = byParent.getOrDefault(c2.getId(), List.of());
                    if (lv3.isEmpty()) {
                        Row r = sheet.createRow(rowIdx++);
                        r.createCell(0).setCellValue(s(c2.getName()));
                        r.createCell(1).setCellValue(s(c2.getSlug()));
                        continue;
                    }
                    for (Category c3 : lv3) {
                        Row r = sheet.createRow(rowIdx++);
                        r.createCell(0).setCellValue(s(c2.getName()));
                        r.createCell(1).setCellValue(s(c2.getSlug()));
                        r.createCell(2).setCellValue(s(c3.getName()));
                        r.createCell(3).setCellValue(s(c3.getSlug()));
                    }
                }

                for (int c = 0; c < 4; c++) sheet.autoSizeColumn(c);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                wb.write(baos);
                byte[] bytes = baos.toByteArray();

                return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .header("Content-Disposition", "attachment; filename=categories_" + rootId + ".xlsx")
                    .body(new ByteArrayResource(bytes));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private static String s(String v) {
        return v == null ? "" : v;
    }

    private static boolean isCustomer(User u) {
        if (u == null || u.getRoles() == null) return true;
        return !u.getRoles().contains(UserRole.ADMIN)
            && !u.getRoles().contains(UserRole.STAFF)
            && !u.getRoles().contains(UserRole.MANAGER);
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

    @PostMapping("/coupons")
    public ResponseEntity<ApiResponse<AdminCouponResponse>> createCoupon(@RequestBody AdminCouponUpsertRequest req) {
        if (req == null || req.getCode() == null || req.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Code là bắt buộc"));
        }
        String code = req.getCode().trim();
        if (couponRepository.findByCode(code).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Code đã tồn tại"));
        }

        Coupon c = new Coupon();
        c.setCode(code);
        c.setDescription(req.getDescription());
        c.setDiscountAmount(req.getDiscountAmount());
        c.setDiscountPercent(req.getDiscountPercent());
        c.setMinOrderAmount(req.getMinOrderAmount());
        c.setMaxDiscountAmount(req.getMaxDiscountAmount());
        c.setShippingDiscountAmount(req.getShippingDiscountAmount());
        c.setAllowedSegments(req.getAllowedSegments());
        c.setUsageLimit(req.getUsageLimit());
        c.setUsedCount(0);
        c.setStartsAt(req.getStartsAt());
        c.setEndsAt(req.getEndsAt());
        c.setActive(req.getActive() != null ? req.getActive() : Boolean.TRUE);

        Coupon saved;
        try {
            saved = couponRepository.save(c);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }

        AdminCouponResponse res = new AdminCouponResponse(
            saved.getId(),
            saved.getCode(),
            saved.getDescription(),
            saved.getDiscountAmount(),
            saved.getDiscountPercent(),
            saved.getMinOrderAmount(),
            saved.getMaxDiscountAmount(),
            saved.getShippingDiscountAmount(),
            saved.getAllowedSegments(),
            saved.getUsageLimit(),
            saved.getUsedCount(),
            saved.getStartsAt(),
            saved.getEndsAt(),
            saved.getActive()
        );
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @PutMapping("/coupons/{id}")
    public ResponseEntity<ApiResponse<AdminCouponResponse>> updateCoupon(
        @PathVariable("id") Long id,
        @RequestBody AdminCouponUpsertRequest req
    ) {
        var opt = couponRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy mã giảm giá"));
        }
        Coupon c = opt.get();
        if (req != null) {
            if (req.getCode() != null && !req.getCode().trim().isEmpty()) {
                String code = req.getCode().trim();
                var existing = couponRepository.findByCode(code);
                if (existing.isPresent() && existing.get().getId() != null && !existing.get().getId().equals(id)) {
                    return ResponseEntity.badRequest().body(ApiResponse.fail("Code đã tồn tại"));
                }
                c.setCode(code);
            }
            if (req.getDescription() != null) c.setDescription(req.getDescription());
            if (req.getDiscountAmount() != null) c.setDiscountAmount(req.getDiscountAmount());
            if (req.getDiscountPercent() != null) c.setDiscountPercent(req.getDiscountPercent());
            if (req.getMinOrderAmount() != null) c.setMinOrderAmount(req.getMinOrderAmount());
            if (req.getMaxDiscountAmount() != null) c.setMaxDiscountAmount(req.getMaxDiscountAmount());
            if (req.getShippingDiscountAmount() != null) c.setShippingDiscountAmount(req.getShippingDiscountAmount());
            if (req.getAllowedSegments() != null) c.setAllowedSegments(req.getAllowedSegments());
            if (req.getUsageLimit() != null) c.setUsageLimit(req.getUsageLimit());
            if (req.getStartsAt() != null) c.setStartsAt(req.getStartsAt());
            if (req.getEndsAt() != null) c.setEndsAt(req.getEndsAt());
            if (req.getActive() != null) c.setActive(req.getActive());
        }

        Coupon saved;
        try {
            saved = couponRepository.save(c);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }

        AdminCouponResponse res = new AdminCouponResponse(
            saved.getId(),
            saved.getCode(),
            saved.getDescription(),
            saved.getDiscountAmount(),
            saved.getDiscountPercent(),
            saved.getMinOrderAmount(),
            saved.getMaxDiscountAmount(),
            saved.getShippingDiscountAmount(),
            saved.getAllowedSegments(),
            saved.getUsageLimit(),
            saved.getUsedCount(),
            saved.getStartsAt(),
            saved.getEndsAt(),
            saved.getActive()
        );
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @DeleteMapping("/coupons/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCoupon(@PathVariable("id") Long id) {
        var opt = couponRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy mã giảm giá"));
        }
        couponRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xóa mã giảm giá"));
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
        c.setSlug(normalizeSlug(req.getSlug(), c.getName()));
        c.setParentId(req.getParentId());
        c.setIcon(req.getIcon());
        c.setDescription(req.getDescription());
        c.setActive(req.getActive() != null ? req.getActive() : Boolean.TRUE);

        try {
            validateParentDepth(c.getParentId(), null);
            validateSlugUnique(c.getSlug(), null);
        } catch (BadRequestException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<AdminCategoryResponse>fail(ex.getMessage()));
        }

        Category saved;
        try {
            saved = categoryRepository.save(c);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.<AdminCategoryResponse>fail("Không thể tạo danh mục: " + msg));
        }
        AdminCategoryResponse res = new AdminCategoryResponse(
            saved.getId(),
            saved.getName(),
            saved.getSlug(),
            saved.getParentId(),
            saved.getIcon(),
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
                c.setSlug(normalizeSlug(req.getSlug(), c.getName()));
                c.setParentId(req.getParentId());
                c.setIcon(req.getIcon());
                c.setDescription(req.getDescription());
                c.setActive(req.getActive() != null ? req.getActive() : c.getActive());

                try {
                    validateParentDepth(c.getParentId(), id);
                    validateSlugUnique(c.getSlug(), id);
                } catch (BadRequestException ex) {
                    return ResponseEntity.badRequest().body(ApiResponse.<AdminCategoryResponse>fail(ex.getMessage()));
                }

                Category saved;
                try {
                    saved = categoryRepository.save(c);
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
                    return ResponseEntity.badRequest().body(ApiResponse.<AdminCategoryResponse>fail("Không thể cập nhật danh mục: " + msg));
                }
                AdminCategoryResponse res = new AdminCategoryResponse(
                    saved.getId(),
                    saved.getName(),
                    saved.getSlug(),
                    saved.getParentId(),
                    saved.getIcon(),
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

    @PostMapping(path = "/categories/import-excel", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> importCategoriesExcel(
        @RequestParam("rootId") Long rootId,
        @RequestParam("file") MultipartFile file
    ) {
        if (rootId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu rootId"));
        }
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("File trống"));
        }
        Category root = categoryRepository.findById(rootId).orElse(null);
        if (root == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Danh mục lớn không tồn tại: " + rootId));
        }
        if (root.getParentId() != null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("rootId phải là danh mục cấp 1"));
        }

        int created = 0;
        int updated = 0;
        int skipped = 0;

        try (InputStream is = file.getInputStream(); Workbook wb = new XSSFWorkbook(is)) {
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy sheet trong file"));
            }

            for (int i = sheet.getFirstRowNum(); i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String lv2Name = cellString(row.getCell(0));
                String lv2Slug = cellString(row.getCell(1));
                String lv3Name = cellString(row.getCell(2));
                String lv3Slug = cellString(row.getCell(3));

                // Optional header auto-skip
                if (i == sheet.getFirstRowNum()) {
                    String h = (lv2Name + " " + lv3Name).toLowerCase(Locale.ROOT);
                    if (h.contains("lv2") || h.contains("cap") || h.contains("name")) {
                        continue;
                    }
                }

                if (lv2Name == null || lv2Name.isBlank()) {
                    skipped++;
                    continue;
                }

                // Upsert Lv2 under root
                String normLv2Slug = normalizeSlug(lv2Slug, lv2Name);
                Category lv2 = categoryRepository.findBySlug(normLv2Slug).orElse(null);
                if (lv2 == null) {
                    lv2 = new Category();
                    lv2.setName(lv2Name.trim());
                    lv2.setSlug(normLv2Slug);
                    lv2.setParentId(rootId);
                    lv2.setActive(Boolean.TRUE);
                    validateParentDepth(lv2.getParentId(), null);
                    validateSlugUnique(lv2.getSlug(), null);
                    categoryRepository.save(lv2);
                    created++;
                } else {
                    // if same slug but belongs elsewhere, reject to avoid corrupting tree
                    if (lv2.getParentId() == null || !java.util.Objects.equals(lv2.getParentId(), rootId)) {
                        return ResponseEntity.badRequest().body(ApiResponse.fail("Slug danh mục cấp 2 đã tồn tại ở danh mục khác: " + normLv2Slug));
                    }
                    boolean changed = false;
                    if (!java.util.Objects.equals(lv2.getName(), lv2Name.trim())) {
                        lv2.setName(lv2Name.trim());
                        changed = true;
                    }
                    if (changed) {
                        validateParentDepth(lv2.getParentId(), lv2.getId());
                        categoryRepository.save(lv2);
                        updated++;
                    }
                }

                // Upsert Lv3 under lv2 if provided
                if (lv3Name != null && !lv3Name.isBlank()) {
                    String normLv3Slug = normalizeSlug(lv3Slug, lv3Name);
                    Category lv3 = categoryRepository.findBySlug(normLv3Slug).orElse(null);
                    if (lv3 == null) {
                        lv3 = new Category();
                        lv3.setName(lv3Name.trim());
                        lv3.setSlug(normLv3Slug);
                        lv3.setParentId(lv2.getId());
                        lv3.setActive(Boolean.TRUE);
                        validateParentDepth(lv3.getParentId(), null);
                        validateSlugUnique(lv3.getSlug(), null);
                        categoryRepository.save(lv3);
                        created++;
                    } else {
                        if (lv3.getParentId() == null || !java.util.Objects.equals(lv3.getParentId(), lv2.getId())) {
                            return ResponseEntity.badRequest().body(ApiResponse.fail("Slug danh mục cấp 3 đã tồn tại ở danh mục khác: " + normLv3Slug));
                        }
                        boolean changed = false;
                        if (!java.util.Objects.equals(lv3.getName(), lv3Name.trim())) {
                            lv3.setName(lv3Name.trim());
                            changed = true;
                        }
                        if (changed) {
                            validateParentDepth(lv3.getParentId(), lv3.getId());
                            categoryRepository.save(lv3);
                            updated++;
                        }
                    }
                }
            }

            return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "created", created,
                "updated", updated,
                "skipped", skipped
            )));
        } catch (BadRequestException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.fail(ex.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Import thất bại: " + e.getMessage()));
        }
    }

    private static String cellString(Cell cell) {
        if (cell == null) return null;
        CellType t = cell.getCellType();
        if (t == CellType.BLANK) return null;
        if (t == CellType.STRING) {
            String v = cell.getStringCellValue();
            return v != null ? v.trim() : null;
        }
        if (t == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            long asLong = (long) d;
            if (Math.abs(d - asLong) < 0.0000001) return String.valueOf(asLong);
            return String.valueOf(d);
        }
        if (t == CellType.BOOLEAN) {
            return String.valueOf(cell.getBooleanCellValue());
        }
        try {
            String v = cell.toString();
            return v != null ? v.trim() : null;
        } catch (Exception e) {
            return null;
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

    @PutMapping(value = "/users/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateUser(
        @PathVariable("id") Long id,
        @RequestBody AdminUserCreateRequest req
    ) {
        var opt = userRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy người dùng"));
        }
        User u = opt.get();
        if (req.getFullName() != null) {
            u.setFullName(req.getFullName());
        }

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

        if (req.getEnabled() != null) {
            u.setEnabled(req.getEnabled());
        }

        // Map roles from strings, accept alias USER -> CUSTOMER
        if (req.getRoles() != null) {
            java.util.Set<com.ecommerce.model.enums.UserRole> roles = new java.util.HashSet<>();
            for (String r : req.getRoles()) {
                if (r == null) continue;
                String key = r.trim().toUpperCase();
                switch (key) {
                    case "ADMIN" -> roles.add(UserRole.ADMIN);
                    case "MANAGER" -> roles.add(UserRole.MANAGER);
                    case "STAFF" -> roles.add(UserRole.STAFF);
                    case "CUSTOMER", "USER" -> roles.add(UserRole.CUSTOMER);
                    default -> {}
                }
            }
            if (!roles.isEmpty()) {
                u.setRoles(roles);
            }
        }

        // Branch mapping (required for STAFF/MANAGER)
        boolean requireBranch = u.getRoles() != null
            && (u.getRoles().contains(UserRole.MANAGER) || u.getRoles().contains(UserRole.STAFF));
        if (req.getBranchId() != null) {
            if (!branchRepository.existsById(req.getBranchId())) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh không tồn tại"));
            }
            u.setBranchId(req.getBranchId());
        }
        if (requireBranch) {
            if (u.getBranchId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh là bắt buộc cho Nhân viên/Quản lý"));
            }
        } else {
            // Clear branch if user is not STAFF/MANAGER
            if (req.getRoles() != null) {
                u.setBranchId(null);
            }
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
            res.setBranchId(saved.getBranchId());
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
                res.setBranchId(saved.getBranchId());
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
                c.getSlug(),
                c.getParentId(),
                c.getIcon(),
                c.getDescription(),
                c.getActive(),
                c.getCreatedAt()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

     private String normalizeSlug(String slug, String name) {
         String base = (slug != null && !slug.isBlank()) ? slug : name;
         if (base == null) return null;
         String s = base.trim().toLowerCase();
         s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
         s = s.replaceAll("\\p{M}+", "");
         s = s.replaceAll("[^a-z0-9]+", "-");
         s = s.replaceAll("(^-|-$)", "");
         return s;
     }

     private void validateSlugUnique(String slug, Long selfId) {
         if (slug == null || slug.isBlank()) {
             throw new BadRequestException("Slug is required");
         }
         var existing = categoryRepository.findBySlug(slug);
         if (existing.isPresent() && (selfId == null || !java.util.Objects.equals(existing.get().getId(), selfId))) {
             Long id = existing.get().getId();
             String name = existing.get().getName();
             throw new BadRequestException("Slug đã tồn tại: " + slug + " (id=" + id + ", name=" + name + ")");
         }
     }

     private void validateParentDepth(Long parentId, Long selfId) {
         if (parentId == null) return;
         if (selfId != null && java.util.Objects.equals(parentId, selfId)) {
             throw new BadRequestException("Invalid parentId");
         }

         int depth = 1;
         Long cur = parentId;
         while (cur != null) {
             Category p = categoryRepository.findById(cur)
                 .orElseThrow(() -> new BadRequestException("Parent category not found"));

             if (selfId != null && java.util.Objects.equals(p.getId(), selfId)) {
                 throw new BadRequestException("Invalid parentId");
             }

             depth++;
             cur = p.getParentId();
             if (depth > 3) {
                 throw new BadRequestException("Category depth must be <= 3");
             }
         }
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
                c.getMinOrderAmount(),
                c.getMaxDiscountAmount(),
                c.getShippingDiscountAmount(),
                c.getAllowedSegments(),
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
        Instant now = Instant.now();
        Instant after = now.minusSeconds(60L * 60 * 24 * 30 * 6);
        List<Order> delivered = orderRepository.findByStatusAndCreatedAtAfter(OrderStatus.DELIVERED, after);
        Map<Long, BigDecimal> spendByUser = new HashMap<>();
        for (Order o : delivered) {
            if (o == null || o.getUserId() == null) continue;
            BigDecimal subtotal = o.getSubtotal() == null ? BigDecimal.ZERO : o.getSubtotal();
            BigDecimal discount = o.getDiscount() == null ? BigDecimal.ZERO : o.getDiscount();
            BigDecimal spend = subtotal.subtract(discount);
            if (spend.compareTo(BigDecimal.ZERO) < 0) spend = BigDecimal.ZERO;
            spendByUser.merge(o.getUserId(), spend, BigDecimal::add);
        }

        final BigDecimal minEligibleSpend = new BigDecimal("100000");
        final BigDecimal silverMinAvg = new BigDecimal("500000");
        final BigDecimal goldMinAvg = new BigDecimal("1000000");
        final BigDecimal diamondMinAvg = new BigDecimal("1500000");

        List<AdminUserResponse> result = users
            .stream()
            .map(u -> {
                Set<String> roles = u.getRoles() == null
                    ? Set.of()
                    : u.getRoles().stream().map(Enum::name).collect(Collectors.toSet());

                Integer ageMonths = null;
                if (u.getCreatedAt() != null) {
                    ZonedDateTime created = ZonedDateTime.ofInstant(u.getCreatedAt(), ZoneOffset.UTC);
                    ZonedDateTime zNow = ZonedDateTime.ofInstant(now, ZoneOffset.UTC);
                    ageMonths = (int) java.time.temporal.ChronoUnit.MONTHS.between(created.withDayOfMonth(1), zNow.withDayOfMonth(1));
                    if (ageMonths < 0) ageMonths = 0;
                }

                String segment = null;
                BigDecimal total6m = null;
                BigDecimal avgMonthly = null;
                if (isCustomer(u)) {
                    boolean olderThan6Months = ageMonths != null && ageMonths >= 6;
                    total6m = spendByUser.getOrDefault(u.getId(), BigDecimal.ZERO);
                    avgMonthly = total6m.divide(BigDecimal.valueOf(6), 0, RoundingMode.HALF_UP);

                    if (!olderThan6Months) {
                        segment = "TIEM_NANG";
                    } else if (total6m.compareTo(minEligibleSpend) < 0) {
                        segment = "TIEM_NANG";
                    } else if (avgMonthly.compareTo(diamondMinAvg) >= 0) {
                        segment = "KIM_CUONG";
                    } else if (avgMonthly.compareTo(goldMinAvg) >= 0) {
                        segment = "VANG";
                    } else if (avgMonthly.compareTo(silverMinAvg) >= 0) {
                        segment = "BAC";
                    } else {
                        segment = "THAN_THIET";
                    }
                }

                AdminUserResponse out = new AdminUserResponse(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    u.getUsername(),
                    u.getPhone(),
                    roles,
                    u.getEnabled(),
                    u.getCreatedAt(),
                    segment,
                    ageMonths,
                    total6m,
                    avgMonthly
                );
                out.setBranchId(u.getBranchId());
                return out;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> customers() {
        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        Instant now = Instant.now();
        Instant after = now.minusSeconds(60L * 60 * 24 * 30 * 6);
        List<Order> delivered = orderRepository.findByStatusAndCreatedAtAfter(OrderStatus.DELIVERED, after);
        Map<Long, BigDecimal> spendByUser = new HashMap<>();
        for (Order o : delivered) {
            if (o == null || o.getUserId() == null) continue;
            BigDecimal subtotal = o.getSubtotal() == null ? BigDecimal.ZERO : o.getSubtotal();
            BigDecimal discount = o.getDiscount() == null ? BigDecimal.ZERO : o.getDiscount();
            BigDecimal spend = subtotal.subtract(discount);
            if (spend.compareTo(BigDecimal.ZERO) < 0) spend = BigDecimal.ZERO;
            spendByUser.merge(o.getUserId(), spend, BigDecimal::add);
        }

        final BigDecimal minEligibleSpend = new BigDecimal("100000");
        final BigDecimal silverMinAvg = new BigDecimal("500000");
        final BigDecimal goldMinAvg = new BigDecimal("1000000");
        final BigDecimal diamondMinAvg = new BigDecimal("1500000");

        List<AdminUserResponse> result = users.stream()
            .filter(AdminDataController::isCustomer)
            .map(u -> {
                Set<String> roles = u.getRoles() == null
                    ? Set.of()
                    : u.getRoles().stream().map(Enum::name).collect(Collectors.toSet());

                Integer ageMonths = null;
                if (u.getCreatedAt() != null) {
                    ZonedDateTime created = ZonedDateTime.ofInstant(u.getCreatedAt(), ZoneOffset.UTC);
                    ZonedDateTime zNow = ZonedDateTime.ofInstant(now, ZoneOffset.UTC);
                    ageMonths = (int) java.time.temporal.ChronoUnit.MONTHS.between(created.withDayOfMonth(1), zNow.withDayOfMonth(1));
                    if (ageMonths < 0) ageMonths = 0;
                }

                boolean olderThan6Months = ageMonths != null && ageMonths >= 6;
                BigDecimal total6m = spendByUser.getOrDefault(u.getId(), BigDecimal.ZERO);
                BigDecimal avgMonthly = total6m.divide(BigDecimal.valueOf(6), 0, RoundingMode.HALF_UP);

                String segment;
                if (!olderThan6Months) {
                    segment = "TIEM_NANG";
                } else if (total6m.compareTo(minEligibleSpend) < 0) {
                    segment = "TIEM_NANG";
                } else if (avgMonthly.compareTo(diamondMinAvg) >= 0) {
                    segment = "KIM_CUONG";
                } else if (avgMonthly.compareTo(goldMinAvg) >= 0) {
                    segment = "VANG";
                } else if (avgMonthly.compareTo(silverMinAvg) >= 0) {
                    segment = "BAC";
                } else {
                    segment = "THAN_THIET";
                }

                return new AdminUserResponse(
                    u.getId(),
                    u.getFullName(),
                    u.getEmail(),
                    u.getUsername(),
                    u.getPhone(),
                    roles,
                    u.getEnabled(),
                    u.getCreatedAt(),
                    segment,
                    ageMonths,
                    total6m,
                    avgMonthly
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
                    case "MANAGER" -> roles.add(UserRole.MANAGER);
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

        boolean requireBranch = roles.contains(UserRole.MANAGER) || roles.contains(UserRole.STAFF);
        if (requireBranch) {
            if (req.getBranchId() == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh là bắt buộc cho Nhân viên/Quản lý"));
            }
            if (!branchRepository.existsById(req.getBranchId())) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh không tồn tại"));
            }
            u.setBranchId(req.getBranchId());
        } else {
            u.setBranchId(null);
        }

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
        res.setBranchId(saved.getBranchId());
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
