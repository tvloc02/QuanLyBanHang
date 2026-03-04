 package com.ecommerce.controller.order;

import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.OrderStatusLookupResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.OrderItem;
import com.ecommerce.repository.OrderRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/order-status")
public class OrderStatusController {

    private final OrderRepository orderRepository;

    public OrderStatusController(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public ResponseEntity<String> list() {
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<ApiResponse<OrderStatusLookupResponse>> lookup(
        @PathVariable Long orderId,
        @RequestParam(required = false) String phone
    ) {
        if (orderId == null) {
            throw new BadRequestException("orderId is required");
        }

        String requiredPhone = (phone == null ? "" : phone).trim();
        if (requiredPhone.isBlank()) {
            throw new BadRequestException("Vui lòng nhập số điện thoại");
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        String orderPhone = (order.getShippingPhone() == null ? "" : order.getShippingPhone()).trim();
        if (!requiredPhone.isBlank() && !Objects.equals(requiredPhone, orderPhone)) {
            throw new BadRequestException("Không tìm thấy đơn hàng với thông tin đã nhập");
        }

        OrderStatusLookupResponse res = new OrderStatusLookupResponse();
        res.setOrderId(order.getId());
        res.setStatus(order.getStatus());
        res.setTotal(order.getTotal());
        res.setCreatedAt(order.getCreatedAt());
        res.setShippingPhone(order.getShippingPhone());

        List<OrderStatusLookupResponse.Item> items = new ArrayList<>();
        List<OrderItem> rawItems = order.getItems() != null ? order.getItems() : List.of();
        for (OrderItem it : rawItems) {
            if (it == null) continue;
            OrderStatusLookupResponse.Item oi = new OrderStatusLookupResponse.Item();
            oi.setProductName(it.getProductName());
            oi.setQuantity(it.getQuantity());
            oi.setUnitPrice(it.getUnitPrice());
            oi.setTotalPrice(it.getTotalPrice());
            items.add(oi);
        }
        res.setItems(items);

        return ResponseEntity.ok(ApiResponse.ok(res));
    }
}
