package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminBranchStockUpsertRequest;
import com.ecommerce.dto.request.AdminBranchUpsertRequest;
import com.ecommerce.dto.response.AdminBranchResponse;
import com.ecommerce.dto.response.AdminBranchStatsResponse;
import com.ecommerce.dto.response.AdminBranchStockResponse;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.model.entity.Branch;
import com.ecommerce.model.entity.BranchManager;
import com.ecommerce.model.entity.BranchProductStock;
import com.ecommerce.model.entity.User;
import com.ecommerce.model.enums.UserRole;
import com.ecommerce.repository.BranchManagerRepository;
import com.ecommerce.repository.BranchProductStockRepository;
import com.ecommerce.repository.BranchRepository;
import com.ecommerce.repository.ProductRepository;
import com.ecommerce.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin/branches")
public class AdminBranchController {

    private final BranchRepository branchRepository;
    private final BranchManagerRepository branchManagerRepository;
    private final BranchProductStockRepository stockRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public AdminBranchController(
        BranchRepository branchRepository,
        BranchManagerRepository branchManagerRepository,
        BranchProductStockRepository stockRepository,
        ProductRepository productRepository,
        UserRepository userRepository
    ) {
        this.branchRepository = branchRepository;
        this.branchManagerRepository = branchManagerRepository;
        this.stockRepository = stockRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminBranchResponse>>> list() {
        List<Branch> branches = branchRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        List<Long> branchIds = branches.stream().map(Branch::getId).filter(Objects::nonNull).toList();
        Map<Long, List<Long>> managerIdsByBranchId = loadManagerIdsByBranchId(branchIds);
        Map<Long, String> userLabelById = loadUserLabelsForManagers(managerIdsByBranchId);

        Map<Long, long[]> statsByBranchId = new HashMap<>();
        List<BranchProductStock> allStocks = stockRepository.findAll();
        for (BranchProductStock s : allStocks) {
            if (s == null || s.getBranchId() == null) continue;
            long[] st = statsByBranchId.computeIfAbsent(s.getBranchId(), k -> new long[] {0L, 0L});
            st[0] += 1L;
            st[1] += (long) (s.getStock() != null ? s.getStock() : 0);
        }

        List<AdminBranchResponse> result = new ArrayList<>();
        for (Branch b : branches) {
            Long id = b != null ? b.getId() : null;
            result.add(toResponse(b, id != null ? statsByBranchId.get(id) : null, id != null ? managerIdsByBranchId.get(id) : null, userLabelById));
        }
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<AdminBranchResponse>> create(@RequestBody AdminBranchUpsertRequest req) {
        if (req == null) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Dữ liệu không hợp lệ"));
        }
        String code = normalize(req.getCode());
        String name = normalize(req.getName());
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Mã chi nhánh là bắt buộc"));
        }
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Tên chi nhánh là bắt buộc"));
        }
        if (branchRepository.findByCode(code).isPresent()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Mã chi nhánh đã tồn tại"));
        }

        Branch b = new Branch();
        b.setCode(code);
        b.setName(name);
        b.setAddress(normalize(req.getAddress()));
        b.setProvince(normalize(req.getProvince()));
        b.setDistrict(normalize(req.getDistrict()));
        b.setWard(normalize(req.getWard()));
        b.setLatitude(req.getLatitude());
        b.setLongitude(req.getLongitude());
        b.setActive(req.getActive() != null ? req.getActive() : Boolean.TRUE);

        List<Long> managerIds = normalizeManagerIds(req);
        if (!managerIds.isEmpty()) {
            b.setManagerUserId(managerIds.get(0));
        } else {
            b.setManagerUserId(null);
        }

        Branch saved;
        try {
            saved = branchRepository.save(b);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }

        syncBranchManagers(saved.getId(), managerIds);
        Map<Long, String> userLabelById = loadUserLabelsForManagers(Map.of(saved.getId(), managerIds));
        return ResponseEntity.ok(ApiResponse.ok(toResponse(saved, null, managerIds, userLabelById)));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<AdminBranchResponse>> update(
        @PathVariable("id") long id,
        @RequestBody AdminBranchUpsertRequest req
    ) {
        var opt = branchRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy chi nhánh"));
        }
        Branch b = opt.get();

        String code = normalize(req != null ? req.getCode() : null);
        String name = normalize(req != null ? req.getName() : null);

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Mã chi nhánh là bắt buộc"));
        }
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Tên chi nhánh là bắt buộc"));
        }

        var existing = branchRepository.findByCode(code);
        if (existing.isPresent() && existing.get().getId() != null && !Objects.equals(existing.get().getId(), id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Mã chi nhánh đã tồn tại"));
        }

        b.setCode(code);
        b.setName(name);
        b.setAddress(normalize(req != null ? req.getAddress() : null));
        b.setProvince(normalize(req != null ? req.getProvince() : null));
        b.setDistrict(normalize(req != null ? req.getDistrict() : null));
        b.setWard(normalize(req != null ? req.getWard() : null));
        b.setLatitude(req != null ? req.getLatitude() : null);
        b.setLongitude(req != null ? req.getLongitude() : null);
        if (req != null && req.getActive() != null) {
            b.setActive(req.getActive());
        }

        List<Long> managerIds = normalizeManagerIds(req);
        if (!managerIds.isEmpty()) {
            b.setManagerUserId(managerIds.get(0));
        } else {
            b.setManagerUserId(null);
        }

        Branch saved;
        try {
            saved = branchRepository.save(b);
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Vi phạm ràng buộc dữ liệu: " + msg));
        }

        syncBranchManagers(saved.getId(), managerIds);
        Map<Long, String> userLabelById = loadUserLabelsForManagers(Map.of(saved.getId(), managerIds));
        return ResponseEntity.ok(ApiResponse.ok(toResponse(saved, null, managerIds, userLabelById)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable("id") long id) {
        if (!branchRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy chi nhánh"));
        }
        try {
            branchRepository.deleteById(id);
            return ResponseEntity.ok(ApiResponse.ok("Đã xóa chi nhánh"));
        } catch (DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không thể xóa chi nhánh do ràng buộc dữ liệu: " + msg));
        }
    }

    @GetMapping("/{id}/stocks")
    public ResponseEntity<ApiResponse<List<AdminBranchStockResponse>>> listStocks(@PathVariable("id") long id) {
        if (!branchRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy chi nhánh"));
        }
        List<BranchProductStock> stocks = stockRepository.findByBranchId(id);
        List<AdminBranchStockResponse> res = stocks.stream().map(AdminBranchController::toStockResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(res));
    }

    @PutMapping("/{id}/stocks")
    public ResponseEntity<ApiResponse<List<AdminBranchStockResponse>>> upsertStocks(
        @PathVariable("id") long id,
        @RequestBody List<AdminBranchStockUpsertRequest> req
    ) {
        if (!branchRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy chi nhánh"));
        }

        List<AdminBranchStockUpsertRequest> items = req != null ? req : List.of();
        for (AdminBranchStockUpsertRequest it : items) {
            Long productId = it != null ? it.getProductId() : null;
            if (productId == null) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Thiếu productId"));
            }
            if (!productRepository.existsById(productId)) {
                return ResponseEntity.badRequest().body(ApiResponse.fail("Sản phẩm không tồn tại: " + productId));
            }
        }

        List<BranchProductStock> saved = new ArrayList<>();
        for (AdminBranchStockUpsertRequest it : items) {
            Long productId = it.getProductId();
            int stock = it.getStock() != null ? it.getStock() : 0;
            if (stock < 0) stock = 0;

            BranchProductStock row = stockRepository
                .findByBranchIdAndProductId(id, productId)
                .orElseGet(() -> {
                    BranchProductStock s = new BranchProductStock();
                    s.setBranchId(id);
                    s.setProductId(productId);
                    return s;
                });
            row.setStock(stock);
            saved.add(stockRepository.save(row));
        }

        List<AdminBranchStockResponse> out = saved.stream().map(AdminBranchController::toStockResponse).toList();
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<ApiResponse<AdminBranchStatsResponse>> stats(@PathVariable("id") long id) {
        if (!branchRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(ApiResponse.fail("Không tìm thấy chi nhánh"));
        }
        List<BranchProductStock> stocks = stockRepository.findByBranchId(id);
        long productCount = stocks.size();
        long totalStock = stocks.stream().mapToLong(s -> (long) (s.getStock() != null ? s.getStock() : 0)).sum();
        AdminBranchStatsResponse out = new AdminBranchStatsResponse(productCount, totalStock, 0L);
        return ResponseEntity.ok(ApiResponse.ok(out));
    }

    private static String normalize(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private AdminBranchResponse toResponse(Branch b, long[] stats, List<Long> managerIds, Map<Long, String> userLabelById) {
        AdminBranchResponse out = new AdminBranchResponse();
        out.setId(b.getId());
        out.setCode(b.getCode());
        out.setName(b.getName());

        List<Long> mids = managerIds != null ? managerIds : Collections.emptyList();
        List<String> mnames = new ArrayList<>();
        for (Long uid : mids) {
            if (uid == null) continue;
            String label = userLabelById != null ? userLabelById.get(uid) : null;
            if (label != null) mnames.add(label);
        }
        out.setManagerUserIds(mids);
        out.setManagerNames(mnames);

        Long legacyManagerId = !mids.isEmpty() ? mids.get(0) : b.getManagerUserId();
        out.setManagerUserId(legacyManagerId);
        if (legacyManagerId != null) {
            String label = userLabelById != null ? userLabelById.get(legacyManagerId) : null;
            out.setManagerName(label);
        }

        out.setAddress(b.getAddress());
        out.setProvince(b.getProvince());
        out.setDistrict(b.getDistrict());
        out.setWard(b.getWard());
        out.setLatitude(b.getLatitude());
        out.setLongitude(b.getLongitude());
        out.setActive(b.getActive() != false);
        long productCount = stats != null ? stats[0] : 0L;
        long totalStock = stats != null ? stats[1] : 0L;
        out.setProductCount(productCount);
        out.setTotalStock(totalStock);
        out.setCreatedAt(b.getCreatedAt());
        out.setUpdatedAt(b.getUpdatedAt());
        return out;
    }

    private List<Long> normalizeManagerIds(AdminBranchUpsertRequest req) {
        if (req == null) return List.of();
        List<Long> ids = req.getManagerUserIds();
        Set<Long> uniqueIds = new LinkedHashSet<>();
        if (ids != null) {
            for (Long id : ids) {
                if (id != null) uniqueIds.add(id);
            }
        }
        if (uniqueIds.isEmpty() && req.getManagerUserId() != null) {
            uniqueIds.add(req.getManagerUserId());
        }
        return new ArrayList<>(uniqueIds);
    }

    private Map<Long, List<Long>> loadManagerIdsByBranchId(List<Long> branchIds) {
        if (branchIds == null || branchIds.isEmpty()) return Map.of();
        List<BranchManager> rows = branchManagerRepository.findByBranchIdIn(branchIds);
        Map<Long, List<Long>> out = new HashMap<>();
        for (Long bid : branchIds) {
            if (bid != null) out.put(bid, new ArrayList<>());
        }
        for (BranchManager bm : rows) {
            if (bm == null || bm.getBranchId() == null || bm.getUserId() == null) continue;
            out.computeIfAbsent(bm.getBranchId(), k -> new ArrayList<>()).add(bm.getUserId());
        }
        for (Long bid : branchIds) {
            if (bid == null) continue;
            List<Long> m = out.getOrDefault(bid, new ArrayList<>());
            if (!m.isEmpty()) continue;
            branchRepository.findById(bid).ifPresent(br -> {
                if (br.getManagerUserId() != null) {
                    m.add(br.getManagerUserId());
                }
            });
            out.put(bid, m);
        }
        return out;
    }

    private Map<Long, String> loadUserLabelsForManagers(Map<Long, List<Long>> managerIdsByBranchId) {
        if (managerIdsByBranchId == null || managerIdsByBranchId.isEmpty()) return Map.of();
        Set<Long> userIds = new HashSet<>();
        for (List<Long> ids : managerIdsByBranchId.values()) {
            if (ids == null) continue;
            for (Long id : ids) if (id != null) userIds.add(id);
        }
        if (userIds.isEmpty()) return Map.of();
        List<User> users = userRepository.findAllById(userIds);
        Map<Long, String> out = new HashMap<>();
        for (User u : users) {
            if (u == null || u.getId() == null) continue;
            String fullName = u.getFullName();
            String username = u.getUsername();
            String label = normalize(fullName);
            if (label == null) label = normalize(username);
            if (label == null) label = "#" + u.getId();
            out.put(u.getId(), label);
        }
        return out;
    }

    private void syncBranchManagers(Long branchId, List<Long> managerIds) {
        if (branchId == null) return;
        List<BranchManager> existing = branchManagerRepository.findByBranchId(branchId);
        Map<Long, BranchManager> existingByUserId = new HashMap<>();
        for (BranchManager bm : existing) {
            if (bm != null && bm.getUserId() != null && !existingByUserId.containsKey(bm.getUserId())) {
                existingByUserId.put(bm.getUserId(), bm);
            }
        }

        Set<Long> oldUserIds = new HashSet<>();
        for (BranchManager bm : existing) {
            if (bm != null && bm.getUserId() != null) oldUserIds.add(bm.getUserId());
        }

        List<Long> ids = managerIds != null ? managerIds : List.of();
        Set<Long> newUserIds = new HashSet<>();
        for (Long userId : ids) {
            if (userId == null) continue;
            newUserIds.add(userId);
            userRepository.findById(userId).ifPresent(u -> {
                if (u.getRoles() == null || !u.getRoles().contains(UserRole.MANAGER)) {
                    return;
                }
                u.setBranchId(branchId);
                u.setUpdatedAt(Instant.now());
                userRepository.save(u);
                if (!oldUserIds.contains(userId)) {
                    BranchManager bm = new BranchManager();
                    bm.setBranchId(branchId);
                    bm.setUserId(userId);
                    branchManagerRepository.save(bm);
                }
            });
        }

        for (Long oldId : oldUserIds) {
            if (oldId == null) continue;
            if (newUserIds.contains(oldId)) continue;
            BranchManager existingManager = existingByUserId.get(oldId);
            if (existingManager != null && existingManager.getId() != null) {
                branchManagerRepository.delete(existingManager);
            }
            userRepository.findById(oldId).ifPresent(u -> {
                if (u.getRoles() == null || !u.getRoles().contains(UserRole.MANAGER)) return;
                if (u.getBranchId() != null && Objects.equals(u.getBranchId(), branchId)) {
                    u.setBranchId(null);
                    u.setUpdatedAt(Instant.now());
                    userRepository.save(u);
                }
            });
        }
    }

    private static AdminBranchStockResponse toStockResponse(BranchProductStock s) {
        AdminBranchStockResponse out = new AdminBranchStockResponse();
        out.setProductId(s.getProductId());
        out.setStock(s.getStock() != null ? s.getStock() : 0);
        out.setUpdatedAt(s.getUpdatedAt());
        return out;
    }
}
