package com.ecommerce.repository;

import com.ecommerce.model.entity.ProductType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductTypeRepository extends JpaRepository<ProductType, Long> {
    Optional<ProductType> findByCode(String code);
    boolean existsByCode(String code);
}
