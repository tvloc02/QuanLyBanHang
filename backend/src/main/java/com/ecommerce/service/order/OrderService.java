package com.ecommerce.service.order;

import com.ecommerce.dto.request.OrderCreateRequest;
import com.ecommerce.dto.request.OrderItemRequest;
import com.ecommerce.dto.request.OrderQuoteRequest;
import com.ecommerce.dto.response.OrderResponse;
import com.ecommerce.dto.response.OrderQuoteResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.model.entity.Branch;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.OrderItem;
import com.ecommerce.repository.BranchProductStockRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.service.payment.CouponService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CouponService couponService;
    private final BranchRepository branchRepository;
    private final BranchProductStockRepository branchProductStockRepository;

    public OrderService(
        OrderRepository orderRepository,
        CouponService couponService,
        BranchRepository branchRepository,
        BranchProductStockRepository branchProductStockRepository
    ) {
        this.orderRepository = orderRepository;
        this.couponService = couponService;
        this.branchRepository = branchRepository;
        this.branchProductStockRepository = branchProductStockRepository;
    }

    public OrderQuoteResponse quote(OrderQuoteRequest req) {
        if (req == null || req.getItems() == null || req.getItems().isEmpty()) {
            throw new BadRequestException("Order items is required");
        }
        QuoteResult q = computeQuote(req.getBranchId(), req.getShippingLatitude(), req.getShippingLongitude(), req.getItems());
        return new OrderQuoteResponse(q.branchId, q.distanceKm, q.shippingFee);
    }

    @Transactional
    public OrderResponse createOrder(OrderCreateRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new BadRequestException("Order items is required");
        }

        QuoteResult q = computeQuote(req.getBranchId(), req.getShippingLatitude(), req.getShippingLongitude(), req.getItems());
        BigDecimal shippingFee = req.getShippingFee() != null && req.getShippingFee().compareTo(BigDecimal.ZERO) >= 0
            ? req.getShippingFee()
            : q.shippingFee;

        List<OrderItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequest i : req.getItems()) {
            if (i.getUnitPrice() == null || i.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Invalid unitPrice");
            }
            if (i.getQuantity() == null || i.getQuantity() <= 0) {
                throw new BadRequestException("Invalid quantity");
            }

            BigDecimal lineTotal = i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()));
            OrderItem oi = new OrderItem();
            oi.setProductId(i.getProductId());
            oi.setProductName(i.getProductName());
            oi.setQuantity(i.getQuantity());
            oi.setUnitPrice(i.getUnitPrice());
            oi.setTotalPrice(lineTotal);
            items.add(oi);
            subtotal = subtotal.add(lineTotal);
        }

        Order order = new Order();
        order.setUserId(req.getUserId());
        order.setItems(items);
        order.setSubtotal(subtotal);
        order.setShippingFee(shippingFee);
        order.setDiscount(BigDecimal.ZERO);
        order.setTotal(subtotal.add(shippingFee));
        order.setCouponCode(null);
        order.setShippingFullName(req.getShippingFullName());
        order.setShippingPhone(req.getShippingPhone());
        order.setShippingProvince(req.getShippingProvince());
        order.setShippingWard(req.getShippingWard());
        order.setShippingAddressDetail(req.getShippingAddressDetail());
        order.setBranchId(q.branchId);
        order.setShippingLatitude(req.getShippingLatitude());
        order.setShippingLongitude(req.getShippingLongitude());
        order.setShippingDistanceKm(q.distanceKm);
        Instant now = Instant.now();
        order.setCreatedAt(now);
        order.setUpdatedAt(now);

        Order saved = orderRepository.save(order);

        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            BigDecimal discount = couponService.applyToOrder(req.getUserId(), req.getCouponCode(), subtotal, shippingFee, saved.getId());
            saved.setCouponCode(req.getCouponCode());
            saved.setDiscount(discount);
            BigDecimal total = subtotal.add(shippingFee).subtract(discount);
            if (total.compareTo(BigDecimal.ZERO) < 0) {
                total = BigDecimal.ZERO;
            }
            saved.setTotal(total);
            saved.setUpdatedAt(Instant.now());
            saved = orderRepository.save(saved);
        }

        decrementBranchStocks(q.branchId, req.getItems());

        return toResponse(saved);
    }

    private record QuoteResult(Long branchId, Double distanceKm, BigDecimal shippingFee) {}

    private QuoteResult computeQuote(Long requestedBranchId, Double shipLat, Double shipLng, List<OrderItemRequest> items) {
        List<Branch> branches = branchRepository.findAll();
        List<Branch> active = branches.stream().filter(b -> b != null && (b.getActive() == null || b.getActive())).toList();
        if (active.isEmpty()) {
            throw new BadRequestException("Không có chi nhánh hoạt động");
        }

        Map<Long, Map<Long, Integer>> stockByBranch = loadStocksByBranch(active);

        if (requestedBranchId != null) {
            Branch b = active.stream().filter(x -> Objects.equals(x.getId(), requestedBranchId)).findFirst().orElse(null);
            if (b == null) {
                throw new BadRequestException("Chi nhánh không tồn tại hoặc không hoạt động");
            }
            if (!canFulfill(stockByBranch.get(b.getId()), items)) {
                throw new BadRequestException("Chi nhánh không đủ tồn kho");
            }

            Double distanceKm = computeDistanceKm(b, shipLat, shipLng);
            BigDecimal fee = computeShippingFee(distanceKm);
            return new QuoteResult(b.getId(), distanceKm, fee);
        }

        List<BranchCandidate> candidates = new ArrayList<>();
        for (Branch b : active) {
            Long bid = b.getId();
            if (bid == null) continue;
            if (!canFulfill(stockByBranch.get(bid), items)) continue;
            Double distanceKm = computeDistanceKm(b, shipLat, shipLng);
            candidates.add(new BranchCandidate(bid, distanceKm));
        }

        if (candidates.isEmpty()) {
            throw new BadRequestException("Không đủ tồn kho ở bất kỳ chi nhánh nào");
        }

        BranchCandidate chosen;
        if (shipLat != null && shipLng != null) {
            chosen = candidates.stream()
                .filter(c -> c.distanceKm != null)
                .min(Comparator.comparingDouble(c -> c.distanceKm))
                .orElseGet(() -> candidates.stream().min(Comparator.comparingLong(c -> c.branchId)).orElse(candidates.get(0)));
        } else {
            chosen = candidates.stream().min(Comparator.comparingLong(c -> c.branchId)).orElse(candidates.get(0));
        }

        BigDecimal fee = computeShippingFee(chosen.distanceKm);
        return new QuoteResult(chosen.branchId, chosen.distanceKm, fee);
    }

    private static class BranchCandidate {
        final long branchId;
        final Double distanceKm;

        BranchCandidate(long branchId, Double distanceKm) {
            this.branchId = branchId;
            this.distanceKm = distanceKm;
        }
    }

    private Map<Long, Map<Long, Integer>> loadStocksByBranch(List<Branch> branches) {
        Map<Long, Map<Long, Integer>> out = new HashMap<>();
        for (Branch b : branches) {
            if (b == null || b.getId() == null) continue;
            out.put(b.getId(), new HashMap<>());
        }
        List<BranchProductStock> rows = branchProductStockRepository.findAll();
        for (BranchProductStock r : rows) {
            if (r == null || r.getBranchId() == null || r.getProductId() == null) continue;
            Map<Long, Integer> m = out.computeIfAbsent(r.getBranchId(), k -> new HashMap<>());
            m.put(r.getProductId(), r.getStock() == null ? 0 : r.getStock());
        }
        return out;
    }

    private boolean canFulfill(Map<Long, Integer> stockByProduct, List<OrderItemRequest> items) {
        Map<Long, Integer> s = stockByProduct != null ? stockByProduct : Map.of();
        for (OrderItemRequest it : items) {
            if (it == null || it.getProductId() == null) return false;
            int qty = it.getQuantity() == null ? 0 : it.getQuantity();
            if (qty <= 0) return false;
            int have = s.getOrDefault(it.getProductId(), 0);
            if (have < qty) return false;
        }
        return true;
    }

    private Double computeDistanceKm(Branch b, Double shipLat, Double shipLng) {
        if (b == null) return null;
        if (shipLat == null || shipLng == null) return null;
        Double lat = b.getLatitude();
        Double lng = b.getLongitude();
        if (lat == null || lng == null) return null;
        return haversineKm(lat, lng, shipLat, shipLng);
    }

    private BigDecimal computeShippingFee(Double distanceKm) {
        if (distanceKm == null) return BigDecimal.ZERO;

        BigDecimal base = new BigDecimal("15000");
        BigDecimal perKm = new BigDecimal("2000");
        long km = (long) Math.ceil(Math.max(0d, distanceKm));
        BigDecimal fee = base.add(perKm.multiply(BigDecimal.valueOf(km)));
        if (fee.compareTo(BigDecimal.ZERO) < 0) fee = BigDecimal.ZERO;
        return fee.setScale(0, RoundingMode.HALF_UP);
    }

    private void decrementBranchStocks(Long branchId, List<OrderItemRequest> items) {
        if (branchId == null) {
            throw new BadRequestException("Không xác định được chi nhánh");
        }
        List<OrderItemRequest> safeItems = items != null ? items : List.of();

        for (OrderItemRequest it : safeItems) {
            if (it == null || it.getProductId() == null) {
                throw new BadRequestException("Thiếu productId");
            }
            int qty = it.getQuantity() == null ? 0 : it.getQuantity();
            if (qty <= 0) {
                throw new BadRequestException("Invalid quantity");
            }

            BranchProductStock row = branchProductStockRepository
                .findByBranchIdAndProductId(branchId, it.getProductId())
                .orElse(null);
            int current = row != null && row.getStock() != null ? row.getStock() : 0;
            if (current < qty) {
                throw new BadRequestException("Không đủ tồn kho cho sản phẩm: " + it.getProductId());
            }
            if (row == null) {
                row = new BranchProductStock();
                row.setBranchId(branchId);
                row.setProductId(it.getProductId());
            }
            row.setStock(current - qty);
            branchProductStockRepository.save(row);
        }
    }

    private static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0088d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2)
                * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public List<OrderResponse> listByUser(Long userId) {
        return orderRepository.findByUserId(userId).stream().map(OrderService::toResponse).toList();
    }

    private static OrderResponse toResponse(Order o) {
        OrderResponse res = new OrderResponse();
        res.setId(o.getId());
        res.setUserId(o.getUserId());
        res.setStatus(o.getStatus());
        res.setSubtotal(o.getSubtotal());
        res.setDiscount(o.getDiscount());
        res.setShippingFee(o.getShippingFee());
        res.setTotal(o.getTotal());
        res.setCouponCode(o.getCouponCode());
        res.setBranchId(o.getBranchId());
        res.setShippingDistanceKm(o.getShippingDistanceKm());
        res.setCreatedAt(o.getCreatedAt());
        return res;
    }
}
