package com.ecommerce.service.home;

import com.ecommerce.dto.request.AdminHomeSectionItemUpsertRequest;
import com.ecommerce.dto.request.AdminHomeSectionUpsertRequest;
import com.ecommerce.dto.response.CouponDto;
import com.ecommerce.dto.response.HomeSectionItemResponse;
import com.ecommerce.dto.response.HomeSectionResponse;
import com.ecommerce.dto.response.ProductResponse;
import com.ecommerce.model.entity.Coupon;
import com.ecommerce.model.entity.HomeSection;
import com.ecommerce.model.entity.HomeSectionItem;
import com.ecommerce.model.entity.Product;
import com.ecommerce.model.enums.HomeSectionItemType;
import com.ecommerce.repository.CouponRepository;
import com.ecommerce.repository.HomeSectionItemRepository;
import com.ecommerce.repository.HomeSectionRepository;
import com.ecommerce.repository.ProductRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HomeSectionService {

    private final HomeSectionRepository homeSectionRepository;
    private final HomeSectionItemRepository homeSectionItemRepository;
    private final ProductRepository productRepository;
    private final CouponRepository couponRepository;

    public HomeSectionService(
        HomeSectionRepository homeSectionRepository,
        HomeSectionItemRepository homeSectionItemRepository,
        ProductRepository productRepository,
        CouponRepository couponRepository
    ) {
        this.homeSectionRepository = homeSectionRepository;
        this.homeSectionItemRepository = homeSectionItemRepository;
        this.productRepository = productRepository;
        this.couponRepository = couponRepository;
    }

    public List<HomeSectionResponse> listAllForAdmin() {
        List<HomeSection> sections = homeSectionRepository.findAll(Sort.by(Sort.Direction.ASC, "sectionKey"));
        return buildResponses(sections, true);
    }

    public List<HomeSectionResponse> listPublic() {
        List<HomeSection> sections = homeSectionRepository.findAll(Sort.by(Sort.Direction.ASC, "sectionKey"))
            .stream()
            .filter(s -> {
                String key = s != null ? s.getSectionKey() : null;
                if (key != null && key.toUpperCase().startsWith("SALE_")) return true;
                return s != null && (s.getEnabled() == null || s.getEnabled());
            })
            .toList();
        return buildResponses(sections, false);
    }

    public HomeSectionResponse getOneForAdmin(String sectionKey) {
        String key = normalizeKey(sectionKey);
        HomeSection section = homeSectionRepository.findById(java.util.Objects.requireNonNull(key)).orElse(null);
        if (section == null) return null;
        return buildResponses(List.of(section), true).stream().findFirst().orElse(null);
    }

    @Transactional
    public HomeSectionResponse upsertSection(String sectionKey, AdminHomeSectionUpsertRequest req) {
        String key = normalizeKey(sectionKey);

        HomeSection section = homeSectionRepository.findById(java.util.Objects.requireNonNull(key)).orElseGet(() -> {
            HomeSection s = new HomeSection();
            s.setSectionKey(key);
            return s;
        });

        if (req != null) {
            if (req.getTitle() != null) section.setTitle(req.getTitle());
            if (req.getEnabled() != null) section.setEnabled(req.getEnabled());
        }
        section.setUpdatedAt(Instant.now());
        homeSectionRepository.save(section);

        homeSectionItemRepository.deleteBySectionKey(key);

        List<AdminHomeSectionItemUpsertRequest> items = req != null && req.getItems() != null ? req.getItems() : List.of();
        int pos = 0;
        for (AdminHomeSectionItemUpsertRequest i : items) {
            if (i == null) continue;

            HomeSectionItemType itemType = i.getItemType();
            if (itemType == null) {
                // Default to LINK if missing
                itemType = HomeSectionItemType.LINK;
            }

            HomeSectionItem row = new HomeSectionItem();
            row.setSectionKey(key);
            row.setPosition(pos++);
            row.setEnabled(i.getEnabled() != null ? i.getEnabled() : Boolean.TRUE);
            row.setItemType(itemType);
            row.setRefId(i.getRefId());
            row.setTitle(i.getTitle());
            row.setTitleColor(i.getTitleColor());
            row.setDescription(i.getDescription());
            row.setImageUrl(i.getImageUrl());
            row.setRoute(i.getRoute());
            row.setCode(i.getCode());
            row.setNote(i.getNote());
            row.setNoteColor(i.getNoteColor());
            row.setButtonText(i.getButtonText());
            homeSectionItemRepository.save(row);
        }

        return getOneForAdmin(key);
    }

    private List<HomeSectionResponse> buildResponses(List<HomeSection> sections, boolean includeDisabledItems) {
        List<String> keys = sections.stream().map(HomeSection::getSectionKey).filter(Objects::nonNull).toList();
        Map<String, List<HomeSectionItem>> itemsByKey = new HashMap<>();
        if (!keys.isEmpty()) {
            List<HomeSectionItem> items = homeSectionItemRepository.findBySectionKeyInOrderBySectionKeyAscPositionAsc(keys);
            if (!includeDisabledItems) {
                items = items
                    .stream()
                    .filter(i -> {
                        String key = i != null ? i.getSectionKey() : null;
                        if (key != null && key.toUpperCase().startsWith("SALE_")) return true;
                        return i != null && (i.getEnabled() == null || i.getEnabled());
                    })
                    .toList();
            }
            for (HomeSectionItem it : items) {
                itemsByKey.computeIfAbsent(it.getSectionKey(), k -> new ArrayList<>()).add(it);
            }
        }

        // Prefetch referenced data
        List<Long> productIds = itemsByKey.values().stream()
            .flatMap(List::stream)
            .filter(i -> i.getItemType() == HomeSectionItemType.PRODUCT)
            .map(HomeSectionItem::getRefId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        List<Long> couponIds = itemsByKey.values().stream()
            .flatMap(List::stream)
            .filter(i -> i.getItemType() == HomeSectionItemType.COUPON)
            .map(HomeSectionItem::getRefId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        Map<Long, Product> productMap = productIds.isEmpty()
            ? Map.of()
            : productRepository.findAllById(productIds).stream().collect(Collectors.toMap(Product::getId, x -> x));

        Map<Long, Coupon> couponMap = couponIds.isEmpty()
            ? Map.of()
            : couponRepository.findAllById(couponIds).stream().collect(Collectors.toMap(Coupon::getId, x -> x));

        List<HomeSectionResponse> out = new ArrayList<>();
        for (HomeSection s : sections) {
            if (s == null) continue;
            HomeSectionResponse res = new HomeSectionResponse();
            res.setSectionKey(s.getSectionKey());
            res.setTitle(s.getTitle());
            res.setEnabled(s.getEnabled());
            res.setUpdatedAt(s.getUpdatedAt());

            List<HomeSectionItem> items = itemsByKey.getOrDefault(s.getSectionKey(), List.of());
            List<HomeSectionItemResponse> itemRes = new ArrayList<>();
            for (HomeSectionItem i : items) {
                if (i == null) continue;
                HomeSectionItemResponse r = new HomeSectionItemResponse();
                r.setId(i.getId());
                r.setSectionKey(i.getSectionKey());
                r.setPosition(i.getPosition());
                r.setEnabled(i.getEnabled());
                r.setItemType(i.getItemType());
                r.setRefId(i.getRefId());
                r.setTitle(i.getTitle());
                r.setTitleColor(i.getTitleColor());
                r.setDescription(i.getDescription());
                r.setImageUrl(i.getImageUrl());
                r.setRoute(i.getRoute());
                r.setCode(i.getCode());
                r.setNote(i.getNote());
                r.setNoteColor(i.getNoteColor());
                r.setButtonText(i.getButtonText());

                if (i.getItemType() == HomeSectionItemType.PRODUCT && i.getRefId() != null) {
                    Product p = productMap.get(i.getRefId());
                    if (p != null) {
                        r.setProduct(toProductResponse(p));
                    }
                }

                if (i.getItemType() == HomeSectionItemType.COUPON && i.getRefId() != null) {
                    Coupon c = couponMap.get(i.getRefId());
                    if (c != null) {
                        r.setCoupon(toCouponDto(c));
                    }
                }

                itemRes.add(r);
            }
            res.setItems(itemRes);
            out.add(res);
        }
        return out;
    }

    private static String normalizeKey(String sectionKey) {
        String k = sectionKey == null ? "" : sectionKey.trim();
        if (k.isEmpty()) return k;
        return k.toUpperCase();
    }

    private static ProductResponse toProductResponse(Product p) {
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
        res.setCategoryIds(p.getCategoryIds());
        res.setCategory(p.getCategory());
        res.setBrand(p.getBrand());
        res.setImageUrl(p.getImageUrl());
        res.setBadge(p.getBadge());
        res.setDiscountPercent(p.getDiscountPercent());
        res.setRating(p.getRating());
        res.setSoldCount(p.getSoldCount());
        res.setSizes(p.getSizes());
        res.setColors(p.getColors());
        res.setImages(p.getImages());
        res.setActive(p.getActive());
        return res;
    }

    private static CouponDto toCouponDto(Coupon c) {
        CouponDto dto = new CouponDto();
        dto.setId(c.getId());
        dto.setCode(c.getCode());
        dto.setDescription(c.getDescription());
        dto.setType(c.getType());
        dto.setDiscountAmount(c.getDiscountAmount());
        dto.setDiscountPercent(c.getDiscountPercent());
        dto.setMinOrderAmount(c.getMinOrderAmount());
        dto.setMaxDiscountAmount(c.getMaxDiscountAmount());
        dto.setShippingDiscountAmount(c.getShippingDiscountAmount());
        dto.setTargetUserIds(c.getTargetUserIds());
        dto.setUsageLimit(c.getUsageLimit());
        dto.setUsedCount(c.getUsedCount());
        dto.setStartsAt(c.getStartsAt());
        dto.setEndsAt(c.getEndsAt());
        dto.setActive(c.getActive());
        return dto;
    }
}
