package com.ecommerce.repository;

import com.ecommerce.model.entity.BranchManager;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchManagerRepository extends JpaRepository<BranchManager, Long> {
    List<BranchManager> findByBranchId(Long branchId);

    List<BranchManager> findByBranchIdIn(List<Long> branchIds);

    List<BranchManager> findByUserId(Long userId);

    List<BranchManager> findByUserIdIn(List<Long> userIds);

    Optional<BranchManager> findByBranchIdAndUserId(Long branchId, Long userId);

    long deleteByBranchId(Long branchId);
}
