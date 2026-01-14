package com.ecommerce.service.product;

import com.ecommerce.dto.request.ProductSearchRequest;
import com.ecommerce.dto.request.ProductUpsertRequest;
import com.ecommerce.dto.response.ProductDto;
import com.ecommerce.dto.response.ProductResponse;
import com.ecommerce.dto.response.ProductSearchResponse;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Product;
import com.ecommerce.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<ProductResponse> list() {
        return productRepository.findAll().stream().map(ProductService::toResponse).toList();
    }

    public ProductResponse get(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return toResponse(product);
    }

    public ProductResponse getBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        return toResponse(product);
    }

    public ProductResponse create(ProductUpsertRequest req) {
        Product product = new Product();
        applyUpsert(product, req);
        Product saved = productRepository.save(product);
        return toResponse(saved);
    }

    public ProductResponse update(Long id, ProductUpsertRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        applyUpsert(product, req);
        Product saved = productRepository.save(product);
        return toResponse(saved);
    }

    public void delete(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found");
        }
        productRepository.deleteById(id);
    }

    public ProductSearchResponse searchProducts(ProductSearchRequest req) {
        int page = req.getPage() != null ? req.getPage() : 0;
        int limit = req.getLimit() != null ? req.getLimit() : 20;
        Pageable pageable = PageRequest.of(page, limit);

        Page<Product> result;
        if (hasFilters(req) || req.getSort() != null) {
            // Use custom query with filters and sort
            Sort sort = buildSort(req.getSort());
            Pageable sortedPageable = PageRequest.of(page, limit, sort);
            result = productRepository.searchByFilters(
                req.getCategory(),
                req.getMinPrice() != null ? BigDecimal.valueOf(req.getMinPrice()) : null,
                req.getMaxPrice() != null ? BigDecimal.valueOf(req.getMaxPrice()) : null,
                req.getSizes(),
                req.getColors(),
                sortedPageable
            );
        } else {
            // Simple paginated query
            result = productRepository.findAll(pageable);
        }

        List<ProductDto> dtoList = result.getContent().stream()
                .map(ProductDto::fromEntity)
                .toList();

        ProductSearchResponse response = new ProductSearchResponse();
        response.setData(dtoList);
        response.setTotal(result.getTotalElements());
        response.setPage(page);
        response.setTotalPages(result.getTotalPages());
        response.setLimit(limit);
        return response;
    }

    private boolean hasFilters(ProductSearchRequest req) {
        return req.getCategory() != null ||
               req.getMinPrice() != null ||
               req.getMaxPrice() != null ||
               (req.getSizes() != null && !req.getSizes().isEmpty()) ||
               (req.getColors() != null && !req.getColors().isEmpty());
    }

    private Sort buildSort(String sortParam) {
        if (sortParam == null) return Sort.by("createdAt").descending();

        return switch (sortParam) {
            case "price-asc" -> Sort.by("price").ascending();
            case "price-desc" -> Sort.by("price").descending();
            case "bestselling" -> Sort.by("soldCount").descending();
            case "newest" -> Sort.by("createdAt").descending();
            default -> Sort.by("createdAt").descending();
        };
    }

    private static void applyUpsert(Product product, ProductUpsertRequest req) {
        product.setSku(req.getSku());
        product.setName(req.getName());
        product.setSlug(req.getSlug());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setOldPrice(req.getOldPrice());
        product.setStock(req.getStock());
        product.setCategoryId(req.getCategoryId());

        product.setCategory(req.getCategory());
        product.setBrand(req.getBrand());
        product.setImageUrl(req.getImageUrl());
        product.setBadge(req.getBadge());
        product.setDiscountPercent(req.getDiscountPercent());
        product.setRating(req.getRating());
        product.setSoldCount(req.getSoldCount());
        if (req.getSizes() != null) product.setSizes(req.getSizes());
        if (req.getColors() != null) product.setColors(req.getColors());

        if (req.getImages() != null && product.getImageUrl() == null && !req.getImages().isEmpty()) {
            product.setImageUrl(req.getImages().get(0));
        }
        if (req.getActive() != null) {
            product.setActive(req.getActive());
        }
    }

    private static ProductResponse toResponse(Product p) {
        ProductResponse res = new ProductResponse();
        res.setId(p.getId());
        res.setSku(p.getSku());
        res.setName(p.getName());
        res.setSlug(p.getSlug());
        res.setDescription(p.getDescription());
        res.setPrice(p.getPrice());
        res.setOldPrice(p.getOldPrice());
        res.setStock(p.getStock());
        res.setCategoryId(p.getCategoryId());
        res.setCategory(p.getCategory());
        res.setBrand(p.getBrand());
        res.setImageUrl(p.getImageUrl());
        res.setBadge(p.getBadge());
        res.setDiscountPercent(p.getDiscountPercent());
        res.setRating(p.getRating());
        res.setSoldCount(p.getSoldCount());
        res.setSizes(p.getSizes());
        res.setColors(p.getColors());

        if (p.getImageUrl() != null) {
            res.setImages(java.util.List.of(p.getImageUrl()));
        }
        res.setActive(p.getActive());
        return res;
    }
}
