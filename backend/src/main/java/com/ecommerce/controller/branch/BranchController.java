package com.ecommerce.controller.branch;

import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.BranchOptionResponse;
import com.ecommerce.model.entity.Branch;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.model.entity.BranchProductVariantStock;
import com.ecommerce.repository.BranchProductStockRepository;
import com.ecommerce.repository.BranchProductVariantStockRepository;
import com.ecommerce.repository.BranchRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/branches")
public class BranchController {

    private final BranchRepository branchRepository;
    private final BranchProductStockRepository stockRepository;
    private final BranchProductVariantStockRepository variantStockRepository;

    public BranchController(
        BranchRepository branchRepository,
        BranchProductStockRepository stockRepository,
        BranchProductVariantStockRepository variantStockRepository
    ) {
        this.branchRepository = branchRepository;
        this.stockRepository = stockRepository;
        this.variantStockRepository = variantStockRepository;
    }

    @GetMapping("/options")
    public ResponseEntity<ApiResponse<List<BranchOptionResponse>>> options(
        @RequestParam("productId") Long productId,
        @RequestParam(value = "quantity", required = false) Integer quantity,
        @RequestParam(value = "color", required = false) String color,
        @RequestParam(value = "size", required = false) String size
    ) {
        if (productId == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("productId is required"));
        }
        int qty = quantity != null ? quantity : 1;
        if (qty <= 0) qty = 1;

        String c = color != null ? color.trim() : "";
        String s = size != null ? size.trim() : "";
        boolean useVariant = !c.isBlank() && !s.isBlank();

        List<Branch> branches = branchRepository.findAll();
        List<Branch> active = branches.stream()
            .filter(b -> b != null && (b.getActive() == null || b.getActive()))
            .toList();

        Map<Long, Integer> stockByBranchId = new HashMap<>();
        if (useVariant) {
            List<BranchProductVariantStock> rows = variantStockRepository.findByProductId(productId);
            for (BranchProductVariantStock r : rows) {
                if (r == null || r.getBranchId() == null) continue;
                if (r.getColor() == null || r.getSize() == null) continue;
                if (!r.getColor().equalsIgnoreCase(c)) continue;
                if (!r.getSize().equalsIgnoreCase(s)) continue;
                stockByBranchId.put(r.getBranchId(), r.getStock() != null ? r.getStock() : 0);
            }
        }

        // Fallback: if not variant mode or no variant rows found, use product-level stock.
        if (!useVariant || stockByBranchId.isEmpty()) {
            List<BranchProductStock> stocks = stockRepository.findByProductId(productId);
            for (BranchProductStock r : stocks) {
                if (r == null || r.getBranchId() == null) continue;
                stockByBranchId.put(r.getBranchId(), r.getStock() != null ? r.getStock() : 0);
            }
        }

        List<BranchOptionResponse> out = new ArrayList<>();
        for (Branch b : active) {
            Long bid = b.getId();
            if (bid == null) continue;
            int have = stockByBranchId.getOrDefault(bid, 0);
            if (have < qty) continue;

            BranchOptionResponse r = new BranchOptionResponse();
            r.setId(bid);
            r.setName(b.getName());
            r.setAddress(b.getAddress());
            r.setProvince(b.getProvince());
            r.setWard(b.getWard());
            r.setStock(have);
            out.add(r);
        }

        out.sort(
            Comparator
                .comparing((BranchOptionResponse x) -> x.getName() == null ? "" : x.getName())
                .thenComparing(x -> Objects.toString(x.getId(), ""))
        );

        return ResponseEntity.ok(ApiResponse.ok(out));
    }
}
