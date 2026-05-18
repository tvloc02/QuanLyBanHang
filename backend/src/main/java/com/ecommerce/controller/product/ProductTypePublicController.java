package com.ecommerce.controller.product;

import com.ecommerce.dto.response.AdminProductTypeResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.ProductType;
import com.ecommerce.repository.ProductTypeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/product-types")
public class ProductTypePublicController {

    private final ProductTypeRepository productTypeRepository;

    public ProductTypePublicController(ProductTypeRepository productTypeRepository) {
        this.productTypeRepository = productTypeRepository;
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<ApiResponse<AdminProductTypeResponse>> get(@PathVariable("id") long id) {
        ProductType row = productTypeRepository.findById(id).orElse(null);
        if (row == null || row.getActive() == Boolean.FALSE) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Loại sản phẩm không tồn tại: " + id));
        }
        return ResponseEntity.ok(ApiResponse.ok(toResponse(row)));
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
