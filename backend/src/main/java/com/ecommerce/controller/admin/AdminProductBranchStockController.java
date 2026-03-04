package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminProductBranchStockUpsertRequest;
import com.ecommerce.dto.response.AdminProductBranchStockResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.repository.BranchProductStockRepository;
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
public class AdminProductBranchStockController {

    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final BranchProductStockRepository stockRepository;

    public AdminProductBranchStockController(
        ProductRepository productRepository,
        BranchRepository branchRepository,
        BranchProductStockRepository stockRepository
    ) {
        this.productRepository = productRepository;
        this.branchRepository = branchRepository;
        this.stockRepository = stockRepository;
    }

    @GetMapping("/{productId:\\d+}/branch-stocks")
    public ResponseEntity<ApiResponse<List<AdminProductBranchStockResponse>>> listByProduct(
        @PathVariable("productId") long productId
    ) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Sản phẩm không tồn tại: " + productId));
        }
        List<BranchProductStock> rows = stockRepository.findByProductId(productId);
        List<AdminProductBranchStockResponse> out = rows.stream().map(AdminProductBranchStockController::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @PutMapping("/{productId:\\d+}/branch-stocks")
    public ResponseEntity<ApiResponse<List<AdminProductBranchStockResponse>>> upsertByProduct(
        @PathVariable("productId") long productId,
        @RequestBody List<AdminProductBranchStockUpsertRequest> req
    ) {
        if (!productRepository.existsById(productId)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Sản phẩm không tồn tại: " + productId));
        }

        List<AdminProductBranchStockUpsertRequest> items = req != null ? req : List.of();
        for (AdminProductBranchStockUpsertRequest it : items) {
            Long branchId = it != null ? it.getBranchId() : null;
            if (branchId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu branchId"));
            }
            if (!branchRepository.existsById(branchId)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Chi nhánh không tồn tại: " + branchId));
            }
        }

        List<BranchProductStock> saved = new ArrayList<>();
        for (AdminProductBranchStockUpsertRequest it : items) {
            Long branchId = it.getBranchId();
            int stock = it.getStock() != null ? it.getStock() : 0;
            if (stock < 0) stock = 0;

            BranchProductStock row = stockRepository
                .findByBranchIdAndProductId(branchId, productId)
                .orElseGet(() -> {
                    BranchProductStock s = new BranchProductStock();
                    s.setBranchId(branchId);
                    s.setProductId(productId);
                    return s;
                });
            row.setStock(stock);
            saved.add(stockRepository.save(row));
        }

        List<AdminProductBranchStockResponse> out = saved.stream().map(AdminProductBranchStockController::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    private static AdminProductBranchStockResponse toResponse(BranchProductStock s) {
        AdminProductBranchStockResponse out = new AdminProductBranchStockResponse();
        out.setBranchId(s.getBranchId());
        out.setProductId(s.getProductId());
        out.setStock(s.getStock() != null ? s.getStock() : 0);
        out.setUpdatedAt(s.getUpdatedAt());
        return out;
    }
}
