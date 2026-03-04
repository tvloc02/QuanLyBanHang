package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminProductVariantBranchStockUpsertRequest;
import com.ecommerce.dto.response.AdminProductVariantBranchStockResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.BranchProductVariantStock;
import com.ecommerce.repository.BranchProductVariantStockRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.ProductRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductVariantBranchStockController {

    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final BranchProductVariantStockRepository stockRepository;

    public AdminProductVariantBranchStockController(
        ProductRepository productRepository,
        BranchRepository branchRepository,
        BranchProductVariantStockRepository stockRepository
    ) {
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.stockRepository = stockRepository;
    }

    @GetMapping("/{productId:\\d+}/variant-branch-stocks")
    public ResponseEntity<ApiResponse<List<AdminProductVariantBranchStockResponse>>> listByProduct(
        @PathVariable("productId") long productId
    ) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Sản phẩm không tồn tại: " + productId));
        }
        List<BranchProductVariantStock> rows = stockRepository.findByProductId(productId);
        List<AdminProductVariantBranchStockResponse> out = rows.stream().map(AdminProductVariantBranchStockController::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @PutMapping("/{productId:\\d+}/variant-branch-stocks")
    public ResponseEntity<ApiResponse<List<AdminProductVariantBranchStockResponse>>> upsertByProduct(
        @PathVariable("productId") long productId,
        @RequestBody List<AdminProductVariantBranchStockUpsertRequest> req
    ) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Sản phẩm không tồn tại: " + productId));
        }

        List<AdminProductVariantBranchStockUpsertRequest> items = req != null ? req : List.of();
        for (AdminProductVariantBranchStockUpsertRequest it : items) {
            Long branchId = it != null ? it.getBranchId() : null;
            String color = it != null ? it.getColor() : null;
            String size = it != null ? it.getSize() : null;

            if (branchId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu branchId"));
            }
            if (!branchRepository.existsById(branchId)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh không tồn tại: " + branchId));
            }
            if (color == null || color.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu color"));
            }
            if (size == null || size.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu size"));
            }
        }

        List<BranchProductVariantStock> saved = new ArrayList<>();
        for (AdminProductVariantBranchStockUpsertRequest it : items) {
            if (it == null) continue;

            Long branchId = it.getBranchId();
            String color = it.getColor() != null ? it.getColor().trim() : "";
            String size = it.getSize() != null ? it.getSize().trim() : "";

            int stock = it.getStock() != null ? it.getStock() : 0;
            if (stock < 0) stock = 0;

            String imageUrl = it.getImageUrl();
            if (imageUrl != null) {
                imageUrl = imageUrl.trim();
                if (imageUrl.isEmpty()) imageUrl = null;
            }

            BranchProductVariantStock row = stockRepository
                .findByBranchIdAndProductIdAndColorAndSize(branchId, productId, color, size)
                .orElseGet(() -> {
                    BranchProductVariantStock s = new BranchProductVariantStock();
                    s.setBranchId(branchId);
                    s.setProductId(productId);
                    s.setColor(color);
                    s.setSize(size);
                    return s;
                });

            row.setStock(stock);
            row.setImageUrl(imageUrl);
            saved.add(stockRepository.save(row));
        }

        List<AdminProductVariantBranchStockResponse> out = saved.stream().map(AdminProductVariantBranchStockController::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    private static AdminProductVariantBranchStockResponse toResponse(BranchProductVariantStock s) {
        AdminProductVariantBranchStockResponse out = new AdminProductVariantBranchStockResponse();
        out.setBranchId(s.getBranchId());
        out.setProductId(s.getProductId());
        out.setColor(s.getColor());
        out.setSize(s.getSize());
        out.setStock(s.getStock() != null ? s.getStock() : 0);
        out.setImageUrl(s.getImageUrl());
        out.setUpdatedAt(s.getUpdatedAt());
        return out;
    }
}
