package com.ecommerce.controller.admin;

import com.ecommerce.dto.response.AdminProductStockSummaryResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.model.entity.BranchProductVariantStock;
import com.ecommerce.repository.BranchProductStockRepository;
import com.ecommerce.repository.BranchProductVariantStockRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
public class AdminProductStockSummaryController {

    private final BranchProductStockRepository branchProductStockRepository;
    private final BranchProductVariantStockRepository branchProductVariantStockRepository;

    public AdminProductStockSummaryController(
        BranchProductStockRepository branchProductStockRepository,
        BranchProductVariantStockRepository branchProductVariantStockRepository
    ) {
        this.branchProductStockRepository = branchProductStockRepository;
        this.branchProductVariantStockRepository = branchProductVariantStockRepository;
    }

    @GetMapping("/stock-summary")
    public ResponseEntity<ApiResponse<List<AdminProductStockSummaryResponse>>> stockSummary() {
        Map<Long, Integer> totalByProductId = new HashMap<>();
        Set<Long> variantProductIds = new HashSet<>();

        for (BranchProductVariantStock row : branchProductVariantStockRepository.findAll()) {
            if (row == null || row.getProductId() == null) continue;
            long productId = row.getProductId();
            int stock = Math.max(0, row.getStock() != null ? row.getStock() : 0);
            variantProductIds.add(productId);
            totalByProductId.put(productId, totalByProductId.getOrDefault(productId, 0) + stock);
        }

        for (BranchProductStock row : branchProductStockRepository.findAll()) {
            if (row == null || row.getProductId() == null) continue;
            long productId = row.getProductId();
            if (variantProductIds.contains(productId)) continue;
            int stock = Math.max(0, row.getStock() != null ? row.getStock() : 0);
            totalByProductId.put(productId, totalByProductId.getOrDefault(productId, 0) + stock);
        }

        List<AdminProductStockSummaryResponse> out = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : totalByProductId.entrySet()) {
            out.add(new AdminProductStockSummaryResponse(entry.getKey(), entry.getValue()));
        }
        return ResponseEntity.ok(ApiResponse.ok(out));
    }
}
