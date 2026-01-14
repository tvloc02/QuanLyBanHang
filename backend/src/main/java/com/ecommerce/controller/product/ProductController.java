 package com.ecommerce.controller.product;

import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.request.ProductSearchRequest;
import com.ecommerce.dto.request.ProductUpsertRequest;
import com.ecommerce.dto.response.ProductResponse;
import com.ecommerce.dto.response.ProductSearchResponse;
import com.ecommerce.service.product.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(productService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.get(id)));
    }

    /**
     * Search products with filters and pagination
     * Query params: category, minPrice, maxPrice, sizes, colors, sort, page, limit
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<ProductSearchResponse>> searchProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String sizes,
            @RequestParam(required = false) String colors,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer limit) {

        ProductSearchRequest req = new ProductSearchRequest();
        req.setCategory(category);
        req.setMinPrice(minPrice);
        req.setMaxPrice(maxPrice);
        req.setSizes(splitCsv(sizes));
        req.setColors(splitCsv(colors));
        req.setSort(sort);
        req.setPage(page != null ? page : 0);
        req.setLimit(limit != null ? limit : 20);

        ProductSearchResponse response = productService.searchProducts(req);
        return ResponseEntity.ok(new ApiResponse<>(true, "Products retrieved successfully", response));
    }

    private List<String> splitCsv(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (trimmed.isEmpty()) return null;

        List<String> items = Arrays.stream(trimmed.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        return items.isEmpty() ? null : items;
    }

    /**
     * Get product by slug (for detail page)
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ProductResponse>> getProductBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getBySlug(slug)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(@Valid @RequestBody ProductUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(productService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductUpsertRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(productService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
