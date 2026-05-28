package com.ecommerce.service.product;

import com.ecommerce.dto.request.ProductSearchRequest;
import com.ecommerce.dto.request.ProductUpsertRequest;
import com.ecommerce.dto.request.ProductVariantSizeStockRequest;
import com.ecommerce.dto.request.ProductVariantUpsertRequest;
import com.ecommerce.dto.response.ProductDto;
import com.ecommerce.dto.response.ProductResponse;
import com.ecommerce.dto.response.ProductVariantResponse;
import com.ecommerce.dto.response.ProductVariantSizeStockResponse;
import com.ecommerce.dto.response.ProductSearchResponse;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Category;
import com.ecommerce.model.entity.Product;
import com.ecommerce.model.entity.ProductVariant;
import com.ecommerce.model.entity.ProductVariantSizeStock;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import com.ecommerce.repository.CategoryRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.ProductTypeRepository;
import com.ecommerce.repository.ProductVariantRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    private final CategoryRepository categoryRepository;
    
    private final ProductVariantRepository productVariantRepository;

    private final ProductTypeRepository productTypeRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public ProductService(
        ProductRepository productRepository,
        CategoryRepository categoryRepository,
        ProductVariantRepository productVariantRepository,
        ProductTypeRepository productTypeRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.productVariantRepository = productVariantRepository;
        this.productTypeRepository = productTypeRepository;
    }

    private String generateSku(String name) {
        String abbr = abbreviateName(name);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String datePart = today.format(DateTimeFormatter.ofPattern("ddMMyy"));
        String prefix = (abbr + datePart).toUpperCase();

        int next = 1;
        String last = productRepository.findTopBySkuStartingWithOrderBySkuDesc(prefix)
            .map(Product::getSku)
            .orElse(null);
        if (last != null && last.length() >= prefix.length() + 4) {
            String suffix = last.substring(last.length() - 4);
            try {
                int n = Integer.parseInt(suffix);
                if (n >= 0) next = n + 1;
            } catch (NumberFormatException ignored) {
            }
        }

        return prefix + String.format("%04d", next);
    }

    private static final Pattern NON_ALNUM = Pattern.compile("[^A-Za-z0-9 ]+");
    private static final Pattern MULTI_SPACE = Pattern.compile("\\s+");

    private static String abbreviateName(String input) {
        String s = (input == null ? "" : input).trim();
        if (s.isEmpty()) return "SP";

        s = Normalizer.normalize(s, Normalizer.Form.NFD);
        s = s.replaceAll("\\p{M}+", "");
        s = s.replace('đ', 'd').replace('Đ', 'D');
        s = NON_ALNUM.matcher(s).replaceAll(" ");
        s = MULTI_SPACE.matcher(s).replaceAll(" ").trim();
        if (s.isEmpty()) return "SP";

        StringBuilder sb = new StringBuilder();
        for (String part : s.split(" ")) {
            if (part.isBlank()) continue;
            sb.append(Character.toUpperCase(part.charAt(0)));
        }
        return sb.length() > 0 ? sb.toString() : "SP";
    }

    public List<ProductResponse> list() {
        return productRepository.findAll().stream().map(this::toResponse).toList();
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
        if (product.getSku() == null || product.getSku().trim().isEmpty()) {
            product.setSku(generateSku(product.getName()));
        }
        Product saved = productRepository.save(product);
        return toResponse(saved);
    }

    @Transactional
    public ProductResponse update(Long id, ProductUpsertRequest req) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
        
        // Only update basic product info - skip variants for now
        updateBasicProductInfoOnly(product, req);
        
        Product saved = productRepository.save(product);
        return toResponse(saved);
    }
    
    private void updateBasicProductInfoOnly(Product product, ProductUpsertRequest req) {
        if (req.getSku() != null && !req.getSku().trim().isEmpty()) {
            product.setSku(req.getSku().trim());
        }
        product.setName(req.getName());
        product.setSlug(req.getSlug());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setOldPrice(req.getOldPrice());
        product.setStock(req.getStock());
        product.setCategoryId(req.getCategoryId());
        product.setProductTypeId(req.getProductTypeId());
        product.setGender(req.getGender());
        product.setWeightKg(req.getWeightKg());
        product.setAttributesJson(req.getAttributesJson());
        
        // Multi-category support
        if (req.getCategoryId() != null) {
            Set<Long> allIds = new LinkedHashSet<>();
            allIds.add(req.getCategoryId());
            
            Category current = categoryRepository.findById(req.getCategoryId()).orElse(null);
            while (current != null && current.getParentId() != null) {
                allIds.add(current.getParentId());
                current = categoryRepository.findById(current.getParentId()).orElse(null);
            }
            
            product.setCategoryIds(new ArrayList<>(allIds));
        } else {
            product.setCategoryIds(new ArrayList<>());
        }
        
        if (req.getImages() != null) {
            product.setImages(req.getImages());
        }
        
        if (req.getImageUrl() != null && !req.getImageUrl().isBlank()) {
            product.setImageUrl(req.getImageUrl());
        } else if (product.getImages() != null && !product.getImages().isEmpty()) {
            product.setImageUrl(product.getImages().get(0));
        }
        
        if (req.getActive() != null) {
            product.setActive(req.getActive());
        }
        
        // Basic fields only
        product.setCategory(req.getCategory());
        product.setBrand(req.getBrand());
        product.setBadge(req.getBadge());
        product.setDiscountPercent(req.getDiscountPercent());
        product.setRating(req.getRating());
        product.setSoldCount(req.getSoldCount());
        
        // Only set these if they exist in request
        if (req.getSizes() != null) product.setSizes(req.getSizes());
        if (req.getColors() != null) product.setColors(req.getColors());
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
            Long categoryId = null;
            if (req.getCategory() != null && !req.getCategory().isBlank()) {
                categoryId = categoryRepository.findBySlug(req.getCategory()).map(Category::getId).orElse(null);
            }

            result = productRepository.searchByFilters(
                req.getCategory(),
                categoryId,
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
                .filter(product -> product != null)
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

    private void applyUpsert(Product product, ProductUpsertRequest req) {
        if (req.getSku() != null && !req.getSku().trim().isEmpty()) {
            product.setSku(req.getSku().trim());
        }
        product.setName(req.getName());
        product.setSlug(req.getSlug());
        product.setDescription(req.getDescription());
        product.setPrice(req.getPrice());
        product.setOldPrice(req.getOldPrice());
        product.setStock(req.getStock());
        product.setCategoryId(req.getCategoryId());
        product.setProductTypeId(req.getProductTypeId());
        product.setGender(req.getGender());
        product.setWeightKg(req.getWeightKg());
        product.setAttributesJson(req.getAttributesJson());

        // Multi-category support: collect all parent IDs
        if (req.getCategoryId() != null) {
            Set<Long> allIds = new LinkedHashSet<>();
            allIds.add(req.getCategoryId());
            
            // Tìm tất cả cha của danh mục này
            Category current = categoryRepository.findById(req.getCategoryId()).orElse(null);
            while (current != null && current.getParentId() != null) {
                allIds.add(current.getParentId());
                current = categoryRepository.findById(current.getParentId()).orElse(null);
            }
            
            if (req.getCategoryIds() != null) {
                for (Long x : req.getCategoryIds()) {
                    if (x != null) allIds.add(x);
                }
            }
            product.setCategoryIds(new ArrayList<>(allIds));
            product.setCategoryId(req.getCategoryId());
        } else if (req.getCategoryIds() != null) {
            Set<Long> cleaned = new LinkedHashSet<>();
            for (Long x : req.getCategoryIds()) {
                if (x != null) {
                    cleaned.add(x);
                    // Tìm cha của từng danh mục được gửi lên
                    Category current = categoryRepository.findById(x).orElse(null);
                    while (current != null && current.getParentId() != null) {
                        cleaned.add(current.getParentId());
                        current = categoryRepository.findById(current.getParentId()).orElse(null);
                    }
                }
            }
            product.setCategoryIds(new ArrayList<>(cleaned));
            if (product.getCategoryId() == null && !product.getCategoryIds().isEmpty()) {
                product.setCategoryId(product.getCategoryIds().get(0));
            }
        }

        product.setCategory(req.getCategory());
        product.setBrand(req.getBrand());
        product.setWeightKg(req.getWeightKg());
        product.setBadge(req.getBadge());
        product.setDiscountPercent(req.getDiscountPercent());
        product.setRating(req.getRating());
        product.setSoldCount(req.getSoldCount());
        if (req.getSizes() != null) product.setSizes(req.getSizes());
        if (req.getColors() != null) product.setColors(req.getColors());

        if (req.getImages() != null) {
            product.setImages(req.getImages());
        }

        if (req.getImageUrl() != null && !req.getImageUrl().isBlank()) {
            product.setImageUrl(req.getImageUrl());
        } else if (product.getImages() != null && !product.getImages().isEmpty()) {
            product.setImageUrl(product.getImages().get(0));
        }

        if (req.getActive() != null) {
            product.setActive(req.getActive());
        }

        // Variants support: derive colors/sizes/stock/images/price from variants
        if (req.getVariants() != null && !req.getVariants().isEmpty()) {
            List<ProductVariant> newVariants = new ArrayList<>();
            Set<String> colors = new LinkedHashSet<>();
            Set<String> sizes = new LinkedHashSet<>();
            List<String> derivedImages = new ArrayList<>();

            int totalStock = 0;
            BigDecimal minPrice = null;
            BigDecimal maxOldPrice = null;

            for (ProductVariantUpsertRequest v : req.getVariants()) {
                if (v == null) continue;
                if (v.getColor() == null || v.getColor().isBlank()) continue;
                if (v.getPrice() == null) continue;

                // Find existing variant by color using fresh query to avoid stale objects
                ProductVariant pv = productVariantRepository.findByProductIdAndColor(product.getId(), v.getColor().trim())
                    .orElse(null);
                
                if (pv == null) {
                    pv = new ProductVariant();
                    pv.setProduct(product);
                }
                
                pv.setColor(v.getColor().trim());
                pv.setPrice(v.getPrice());
                pv.setOldPrice(v.getOldPrice());
                if (v.getImages() != null) {
                    List<String> imgs = v.getImages().stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList();
                    pv.setImages(new ArrayList<>(imgs));
                }
                if (v.getStocks() != null) {
                    List<ProductVariantSizeStock> st = new ArrayList<>();
                    for (ProductVariantSizeStockRequest s : v.getStocks()) {
                        if (s == null) continue;
                        if (s.getSize() == null || s.getSize().isBlank()) continue;
                        Integer qty = s.getStock();
                        if (qty == null || qty < 0) continue;
                        st.add(new ProductVariantSizeStock(s.getSize().trim(), qty));
                        sizes.add(s.getSize().trim());
                        totalStock += qty;
                    }
                    pv.setStocks(st);
                }

                colors.add(pv.getColor());
                if (pv.getImages() != null) {
                    derivedImages.addAll(pv.getImages());
                }

                if (minPrice == null || pv.getPrice().compareTo(minPrice) < 0) {
                    minPrice = pv.getPrice();
                }
                if (pv.getOldPrice() != null) {
                    if (maxOldPrice == null || pv.getOldPrice().compareTo(maxOldPrice) > 0) {
                        maxOldPrice = pv.getOldPrice();
                    }
                }

                if (v.getActive() != null) {
                    pv.setActive(v.getActive());
                }

                newVariants.add(pv);
            }

            // Remove variants that are no longer in the request
            Set<String> requestedColors = newVariants.stream()
                .map(pv -> pv.getColor())
                .collect(Collectors.toSet());
            
            product.getVariants().removeIf(existing -> !requestedColors.contains(existing.getColor()));
            
            // Add or update variants
            for (ProductVariant pv : newVariants) {
                if (pv.getId() == null) {
                    // New variant, add to collection
                    product.getVariants().add(pv);
                }
                // Existing variant will be updated automatically by JPA
            }

            product.setColors(new ArrayList<>(colors));
            product.setSizes(new ArrayList<>(sizes));
            product.setStock(totalStock);

            if (minPrice != null) {
                product.setPrice(minPrice);
            }
            if (req.getOldPrice() == null && maxOldPrice != null) {
                product.setOldPrice(maxOldPrice);
            }

            if ((req.getImages() == null || req.getImages().isEmpty()) && !derivedImages.isEmpty()) {
                product.setImages(derivedImages);
            }

            if ((req.getImageUrl() == null || req.getImageUrl().isBlank())) {
                if (product.getImages() != null && !product.getImages().isEmpty()) {
                    product.setImageUrl(product.getImages().get(0));
                }
            }
        }
    }

    private ProductResponse toResponse(Product p) {
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
        res.setProductTypeId(p.getProductTypeId());
        if (p.getProductTypeId() != null) {
            String fieldsJson = productTypeRepository.findById(p.getProductTypeId())
                .map(pt -> pt.getFieldsJson())
                .orElse(null);
            res.setProductTypeFieldsJson(fieldsJson);
        }
        res.setGender(p.getGender());
        res.setAttributesJson(p.getAttributesJson());
        res.setCategoryIds(p.getCategoryIds());
        res.setCategory(p.getCategory());
        res.setBrand(p.getBrand());
        res.setWeightKg(p.getWeightKg());
        res.setImageUrl(p.getImageUrl());
        res.setBadge(p.getBadge());
        res.setDiscountPercent(p.getDiscountPercent());
        res.setRating(p.getRating());
        res.setSoldCount(p.getSoldCount());
        res.setSizes(p.getSizes());
        res.setColors(p.getColors());

        if (p.getImages() != null && !p.getImages().isEmpty()) {
            res.setImages(p.getImages());
        } else if (p.getImageUrl() != null) {
            res.setImages(java.util.List.of(p.getImageUrl()));
        }

        if (p.getVariants() != null && !p.getVariants().isEmpty()) {
            List<ProductVariantResponse> vs = new ArrayList<>();
            for (ProductVariant v : p.getVariants()) {
                if (v == null) continue;
                ProductVariantResponse vr = new ProductVariantResponse();
                vr.setId(v.getId());
                vr.setColor(v.getColor());
                vr.setPrice(v.getPrice());
                vr.setOldPrice(v.getOldPrice());
                vr.setImages(v.getImages() != null ? v.getImages() : java.util.List.of());
                vr.setActive(v.getActive());

                List<ProductVariantSizeStockResponse> st = new ArrayList<>();
                if (v.getStocks() != null) {
                    for (ProductVariantSizeStock s : v.getStocks()) {
                        if (s == null) continue;
                        st.add(new ProductVariantSizeStockResponse(s.getSize(), s.getStock()));
                    }
                }
                vr.setStocks(st);
                vs.add(vr);
            }
            res.setVariants(vs);
        }

        res.setActive(p.getActive());
        return res;
    }
}
