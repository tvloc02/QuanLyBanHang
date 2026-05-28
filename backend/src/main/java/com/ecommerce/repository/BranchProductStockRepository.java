package com.ecommerce.repository;

import com.ecommerce.model.entity.BranchProductStock;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchProductStockRepository extends JpaRepository<BranchProductStock, Long> {
    List<BranchProductStock> findByBranchId(Long branchId);

    List<BranchProductStock> findByProductId(Long productId);

    Optional<BranchProductStock> findByBranchIdAndProductId(Long branchId, Long productId);
}
