 package com.ecommerce.controller.order;

import com.ecommerce.dto.request.OrderCreateRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.OrderResponse;
import com.ecommerce.exception.ForbiddenException;
import com.ecommerce.security.SecurityUtils;
import com.ecommerce.service.order.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<OrderResponse>> create(@Valid @RequestBody OrderCreateRequest req) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (!SecurityUtils.isInternalUser() && req != null && req.getUserId() != null && !currentUserId.equals(req.getUserId())) {
            throw new ForbiddenException("Forbidden");
        }
        return ResponseEntity.ok(ApiResponse.ok(orderService.createOrder(req)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrderResponse>>> list(@RequestParam Long userId) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }
        if (!SecurityUtils.isInternalUser() && userId != null && !currentUserId.equals(userId)) {
            throw new ForbiddenException("Forbidden");
        }
        return ResponseEntity.ok(ApiResponse.ok(orderService.listByUser(userId)));
    }
}
