package com.ecommerce.repository;

import com.ecommerce.model.entity.Branch;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByCode(String code);

    List<Branch> findByManagerUserId(Long managerUserId);
}
