package com.ecommerce.service.order;

import com.ecommerce.dto.request.OrderCreateRequest;
import com.ecommerce.dto.request.OrderItemRequest;
import com.ecommerce.dto.response.OrderResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.OrderItem;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.service.payment.CouponService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final CouponService couponService;

    public OrderService(OrderRepository orderRepository, CouponService couponService) {
        this.orderRepository = orderRepository;
        this.couponService = couponService;
    }

    @Transactional
    public OrderResponse createOrder(OrderCreateRequest req) {
        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new BadRequestException("Order items is required");
        }

        BigDecimal shippingFee = req.getShippingFee() == null ? BigDecimal.ZERO : req.getShippingFee();
        if (shippingFee.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Invalid shippingFee");
        }

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
        Instant now = Instant.now();
        order.setCreatedAt(now);
        order.setUpdatedAt(now);

        Order saved = orderRepository.save(order);

        if (req.getCouponCode() != null && !req.getCouponCode().isBlank()) {
            BigDecimal discount = couponService.applyToOrder(req.getUserId(), req.getCouponCode(), subtotal, shippingFee, saved.getId());
            saved.setCouponCode(req.getCouponCode());
            saved.setDiscount(discount);
            BigDecimal total = subtotal.subtract(discount).add(shippingFee);
            if (total.compareTo(BigDecimal.ZERO) < 0) {
                total = BigDecimal.ZERO;
            }
            saved.setTotal(total);
            saved.setUpdatedAt(Instant.now());
            saved = orderRepository.save(saved);
        }

        return toResponse(saved);
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
        res.setCreatedAt(o.getCreatedAt());
        return res;
    }
}
