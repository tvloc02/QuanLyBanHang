package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminProductTypeUpsertRequest;
import com.ecommerce.dto.response.AdminProductTypeResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.ProductType;
import com.ecommerce.repository.ProductTypeRepository;
import java.util.List;
import java.util.Objects;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/product-types")
public class AdminProductTypeController {

    private final ProductTypeRepository productTypeRepository;

    public AdminProductTypeController(ProductTypeRepository productTypeRepository) {
        this.productTypeRepository = productTypeRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminProductTypeResponse>>> list() {
        List<ProductType> rows = productTypeRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        List<AdminProductTypeResponse> out = rows.stream().filter(Objects::nonNull).map(AdminProductTypeController::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<AdminProductTypeResponse>> get(@PathVariable("id") long id) {
        ProductType row = productTypeRepository.findById(id).orElse(null);
        if (row == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Loại sản phẩm không tồn tại: " + id));
        }
        return ResponseEntity.ok(ApiResponse.ok(toResponse(row)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminProductTypeResponse>> create(@RequestBody AdminProductTypeUpsertRequest req) {
        if (req == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu dữ liệu"));
        }
        String code = (req.getCode() == null ? "" : req.getCode().trim());
        String name = (req.getName() == null ? "" : req.getName().trim());
        if (code.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Code là bắt buộc"));
        }
        if (name.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Tên là bắt buộc"));
        }
        if (productTypeRepository.existsByCode(code)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Code đã tồn tại"));
        }

        ProductType row = new ProductType();
        row.setCode(code);
        row.setName(name);
        row.setActive(req.getActive() != null ? req.getActive() : Boolean.TRUE);
        row.setFieldsJson(req.getFieldsJson());

        ProductType saved;
        try {
            saved = productTypeRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu"));
        }
        return ResponseEntity.ok(ApiResponse.ok(toResponse(saved)));
    }

    @PutMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<AdminProductTypeResponse>> update(@PathVariable("id") long id, @RequestBody AdminProductTypeUpsertRequest req) {
        ProductType row = productTypeRepository.findById(id).orElse(null);
        if (row == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Loại sản phẩm không tồn tại: " + id));
        }
        if (req == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu dữ liệu"));
        }

        String code = req.getCode() != null ? req.getCode().trim() : null;
        String name = req.getName() != null ? req.getName().trim() : null;

        if (code != null && !code.isEmpty() && !code.equals(row.getCode())) {
            if (productTypeRepository.existsByCode(code)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Code đã tồn tại"));
            }
            row.setCode(code);
        }
        if (name != null && !name.isEmpty()) {
            row.setName(name);
        }
        if (req.getActive() != null) {
            row.setActive(req.getActive());
        }
        if (req.getFieldsJson() != null) {
            row.setFieldsJson(req.getFieldsJson());
        }

        ProductType saved;
        try {
            saved = productTypeRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu"));
        }
        return ResponseEntity.ok(ApiResponse.ok(toResponse(saved)));
    }

    @DeleteMapping("/{id:\\d+}")
    @Transactional
    public ResponseEntity<ApiResponse<Boolean>> delete(@PathVariable("id") long id) {
        if (!productTypeRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Loại sản phẩm không tồn tại: " + id));
        }
        try {
            productTypeRepository.deleteById(id);
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không thể xóa do ràng buộc dữ liệu"));
        }
        return ResponseEntity.ok(ApiResponse.ok(Boolean.TRUE));
    }

    private static AdminProductTypeResponse toResponse(ProductType row) {
        AdminProductTypeResponse out = new AdminProductTypeResponse();
        out.setId(row.getId());
        out.setCode(row.getCode());
        out.setName(row.getName());
        out.setActive(row.getActive());
        out.setFieldsJson(row.getFieldsJson());
        out.setCreatedAt(row.getCreatedAt());
        out.setUpdatedAt(row.getUpdatedAt());
        return out;
    }
}
