package com.ecommerce.repository;

import com.ecommerce.model.entity.BranchProductVariantStock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchProductVariantStockRepository extends JpaRepository<BranchProductVariantStock, Long> {
    List<BranchProductVariantStock> findByProductId(Long productId);

    Optional<BranchProductVariantStock> findByBranchIdAndProductIdAndColorAndSize(Long branchId, Long productId, String color, String size);
}
