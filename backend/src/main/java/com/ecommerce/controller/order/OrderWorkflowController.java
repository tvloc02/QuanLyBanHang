package com.ecommerce.controller.order;

import com.ecommerce.dto.request.OrderActionRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.OrderResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.exception.ForbiddenException;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.BranchManager;
import com.ecommerce.model.entity.Branch;
import com.ecommerce.model.entity.Order;
import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.OrderStatus;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.BranchManagerRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.OrderRepository;
import com.ecommerce.repository.UserRepository;
import com.ecommerce.security.SecurityUtils;
import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderWorkflowController {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final BranchManagerRepository branchManagerRepository;
    private final BranchRepository branchRepository;

    public OrderWorkflowController(
        OrderRepository orderRepository,
        UserRepository userRepository,
        BranchManagerRepository branchManagerRepository,
        BranchRepository branchRepository
    ) {
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.branchManagerRepository = branchManagerRepository;
        this.branchRepository = branchRepository;
    }

    @PostMapping("/{orderId}/action")
    public ResponseEntity<ApiResponse<OrderResponse>> act(
        @PathVariable Long orderId,
        @RequestBody(required = false) OrderActionRequest req
    ) {
        Long currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            throw new ForbiddenException("Unauthorized");
        }

        User actor = userRepository.findById(currentUserId)
            .orElseThrow(() -> new ForbiddenException("User not found"));
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));

        String action = req != null && req.getAction() != null ? req.getAction().trim().toUpperCase() : "";
        if (action.isEmpty()) {
            throw new BadRequestException("Action is required");
        }

        boolean isAdmin = actor.getRoles() != null && actor.getRoles().contains(UserRole.ADMIN);
        boolean isManager = actor.getRoles() != null && actor.getRoles().contains(UserRole.MANAGER);
        boolean isStaff = actor.getRoles() != null && actor.getRoles().contains(UserRole.STAFF);
        boolean isInternal = isAdmin || isManager || isStaff;
        boolean isOwner = Objects.equals(order.getUserId(), actor.getId());
        Set<Long> accessibleBranchIds = resolveAccessibleBranchIds(actor);

        if (!isAdmin && isInternal && (order.getBranchId() == null || !accessibleBranchIds.contains(order.getBranchId()))) {
            throw new ForbiddenException("Ban khong the thao tac don cua chi nhanh khac");
        }

        OrderStatus current = order.getStatus();
        OrderStatus next;

        switch (action) {
            case "APPROVE" -> {
                if (!isInternal) {
                    throw new ForbiddenException("Chi quan tri noi bo moi duoc duyet don");
                }
                if (current != OrderStatus.PENDING) {
                    throw new BadRequestException("Chi don dang xu ly moi co the duyet");
                }
                next = OrderStatus.CONFIRMED;
            }
            case "PACK" -> {
                if (!isInternal) {
                    throw new ForbiddenException("Chi quan tri noi bo moi duoc dong goi");
                }
                if (current != OrderStatus.CONFIRMED) {
                    throw new BadRequestException("Don phai duoc duyet truoc khi dong goi");
                }
                next = OrderStatus.PACKING;
            }
            case "HANDOVER" -> {
                if (!isInternal) {
                    throw new ForbiddenException("Chi quan tri noi bo moi duoc xac nhan ban giao");
                }
                if (current != OrderStatus.PACKING) {
                    throw new BadRequestException("Don phai o trang thai dong goi truoc khi ban giao van chuyen");
                }
                next = OrderStatus.SHIPPING;
            }
            case "MARK_DELIVERED" -> {
                if (!isInternal) {
                    throw new ForbiddenException("Chi quan tri noi bo moi duoc xac nhan da giao");
                }
                if (current != OrderStatus.SHIPPING) {
                    throw new BadRequestException("Don phai o trang thai dang giao truoc khi danh dau da giao");
                }
                next = OrderStatus.DELIVERED;
            }
            case "CANCEL" -> {
                if (!isOwner && !isInternal) {
                    throw new ForbiddenException("Ban khong the huy don nay");
                }
                if (!(current == OrderStatus.PENDING || current == OrderStatus.CONFIRMED || current == OrderStatus.PACKING)) {
                    throw new BadRequestException("Don nay khong con duoc phep huy");
                }
                next = OrderStatus.CANCELLED;
            }
            case "CONFIRM_RECEIVED" -> {
                if (!isOwner) {
                    throw new ForbiddenException("Chi khach dat hang moi duoc xac nhan da nhan");
                }
                if (current != OrderStatus.DELIVERED) {
                    throw new BadRequestException("Don phai o trang thai da giao truoc khi xac nhan nhan hang");
                }
                next = OrderStatus.COMPLETED;
            }
            default -> throw new BadRequestException("Action khong hop le");
        }

        order.setStatus(next);
        order.setUpdatedAt(Instant.now());
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(ApiResponse.ok("Cap nhat trang thai don hang thanh cong", toResponse(saved)));
    }

    private static OrderResponse toResponse(Order o) {
        OrderResponse res = new OrderResponse();
        res.setId(o.getId());
        res.setOrderCode(o.getOrderCode());
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

    private Set<Long> resolveAccessibleBranchIds(User actor) {
        Set<Long> branchIds = new HashSet<>();
        if (actor == null || actor.getId() == null) {
            return branchIds;
        }

        if (actor.getRoles() != null && actor.getRoles().contains(UserRole.MANAGER)) {
            for (BranchManager assignment : branchManagerRepository.findByUserId(actor.getId())) {
                if (assignment != null && assignment.getBranchId() != null) {
                    branchIds.add(assignment.getBranchId());
                }
            }
            for (Branch branch : branchRepository.findByManagerUserId(actor.getId())) {
                if (branch != null && branch.getId() != null) {
                    branchIds.add(branch.getId());
                }
            }
        }

        if (actor.getBranchId() != null) {
            branchIds.add(actor.getBranchId());
        }

        return branchIds;
    }
}
