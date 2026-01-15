 package com.ecommerce.repository;

import com.ecommerce.model.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryId(Long categoryId);

    @Query("SELECT DISTINCT p FROM Product p WHERE " +
           "(:category IS NULL OR p.category = :category) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:sizes IS NULL OR EXISTS (SELECT s FROM p.sizes s WHERE s IN :sizes)) AND " +
           "(:colors IS NULL OR EXISTS (SELECT c FROM p.colors c WHERE c IN :colors)) AND " +
           "p.active = true")
    Page<Product> searchByFilters(@Param("category") String category,
                                @Param("minPrice") BigDecimal minPrice,
                                @Param("maxPrice") BigDecimal maxPrice,
                                @Param("sizes") List<String> sizes,
                                @Param("colors") List<String> colors,
                                Pageable pageable);

    List<Product> findByCategoryAndActive(String category, Boolean active);

    List<Product> findByActiveOrderBySoldCountDesc(Boolean active);

    List<Product> findByActiveOrderByCreatedAtDesc(Boolean active);

    @Query("SELECT p FROM Product p WHERE p.active = true ORDER BY " +
           "CASE " +
           "WHEN :sort = 'price-asc' THEN p.price END ASC, " +
           "CASE " +
           "WHEN :sort = 'price-desc' THEN p.price END DESC, " +
           "CASE " +
           "WHEN :sort = 'newest' THEN p.createdAt END DESC, " +
           "CASE " +
           "WHEN :sort = 'bestselling' THEN p.soldCount END DESC, " +
           "p.createdAt DESC")
    Page<Product> findAllWithSort(@Param("sort") String sort, Pageable pageable);

    Optional<Product> findBySlug(String slug);
}
