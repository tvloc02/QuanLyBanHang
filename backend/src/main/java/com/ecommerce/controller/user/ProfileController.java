 package com.ecommerce.controller.user;
 
 import com.ecommerce.dto.request.UserAddressItemRequest;
 import com.ecommerce.dto.request.UserMeUpdateRequest;
 import com.ecommerce.dto.response.ApiResponse;
 import com.ecommerce.dto.response.UserAddressItemResponse;
 import com.ecommerce.dto.response.UserMeResponse;
 import com.ecommerce.model.entity.User;
 import com.ecommerce.repository.UserRepository;
 import com.ecommerce.security.SecurityUtils;
 import com.fasterxml.jackson.core.type.TypeReference;
 import com.fasterxml.jackson.databind.ObjectMapper;
 import com.ecommerce.exception.BadRequestException;
 import com.ecommerce.exception.ResourceNotFoundException;
 import java.time.Instant;
 import java.util.ArrayList;
 import java.util.Collections;
 import java.util.List;
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.PutMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RequestBody;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/profile")
 public class ProfileController {
 
     private final UserRepository userRepository;
     private final ObjectMapper objectMapper;

     public ProfileController(UserRepository userRepository, ObjectMapper objectMapper) {
         this.userRepository = userRepository;
         this.objectMapper = objectMapper;
     }

     @GetMapping
     public ResponseEntity<ApiResponse<UserMeResponse>> get() {
         Long userId = SecurityUtils.currentUserId();
         if (userId == null) {
             throw new BadRequestException("Unauthorized");
         }
         User u = userRepository.findById(userId)
             .orElseThrow(() -> new ResourceNotFoundException("User not found"));
         return ResponseEntity.ok(ApiResponse.ok(toMe(u)));
     }

     @PutMapping
     public ResponseEntity<ApiResponse<UserMeResponse>> update(@RequestBody UserMeUpdateRequest request) {
         Long userId = SecurityUtils.currentUserId();
         if (userId == null) {
             throw new BadRequestException("Unauthorized");
         }

         User u = userRepository.findById(userId)
             .orElseThrow(() -> new ResourceNotFoundException("User not found"));

         u.setFullName(normalize(request.getFullName()));
         u.setPhone(normalize(request.getPhone()));
         u.setProvince(normalize(request.getProvince()));
         u.setDistrict(normalize(request.getDistrict()));
         u.setWard(normalize(request.getWard()));
         u.setAddressDetail(normalize(request.getAddressDetail()));
         u.setLatitude(request.getLatitude());
         u.setLongitude(request.getLongitude());
         if (request.getAddresses() != null) {
             List<UserAddressItemResponse> addresses = normalizeAddresses(request.getAddresses());
             u.setAddressesJson(writeAddresses(addresses));
             syncLegacyAddressFromPrimary(u, addresses);
         }
         u.setUpdatedAt(Instant.now());

         u = userRepository.save(u);
         return ResponseEntity.ok(ApiResponse.ok(toMe(u)));
     }

     private static String normalize(String s) {
         if (s == null) return null;
         String t = s.trim();
         return t.isEmpty() ? null : t;
     }

     private UserMeResponse toMe(User u) {
         UserMeResponse out = new UserMeResponse();
         out.setId(u.getId());
         out.setFullName(u.getFullName());
         out.setEmail(u.getEmail());
         out.setUsername(u.getUsername());
         out.setPhone(u.getPhone());
         out.setProvince(u.getProvince());
         out.setDistrict(u.getDistrict());
         out.setWard(u.getWard());
         out.setAddressDetail(u.getAddressDetail());
         out.setLatitude(u.getLatitude());
         out.setLongitude(u.getLongitude());
         out.setAddresses(readAddresses(u));
         out.setCreatedAt(u.getCreatedAt());
         out.setUpdatedAt(u.getUpdatedAt());
         return out;
     }

     private List<UserAddressItemResponse> readAddresses(User u) {
         String raw = normalize(u.getAddressesJson());
         if (raw != null) {
             try {
                 List<UserAddressItemResponse> parsed = objectMapper.readValue(raw, new TypeReference<List<UserAddressItemResponse>>() {});
                 if (parsed != null && !parsed.isEmpty()) {
                     return parsed;
                 }
             } catch (Exception ignored) {
             }
         }

         if (normalize(u.getFullName()) == null
             && normalize(u.getPhone()) == null
             && normalize(u.getProvince()) == null
             && normalize(u.getWard()) == null
             && normalize(u.getAddressDetail()) == null) {
             return Collections.emptyList();
         }

         UserAddressItemResponse fallback = new UserAddressItemResponse();
         fallback.setId(u.getId());
         fallback.setName(u.getFullName());
         fallback.setPhone(u.getPhone());
         fallback.setProvince(u.getProvince());
         fallback.setDistrict(u.getDistrict());
         fallback.setWard(u.getWard());
         fallback.setAddressDetail(u.getAddressDetail());
         fallback.setLatitude(u.getLatitude());
         fallback.setLongitude(u.getLongitude());
         fallback.setType("Nha Rieng");
         fallback.setIsPrimary(true);
         return Collections.singletonList(fallback);
     }

     private List<UserAddressItemResponse> normalizeAddresses(List<UserAddressItemRequest> items) {
         List<UserAddressItemResponse> out = new ArrayList<>();
         for (UserAddressItemRequest item : items) {
             if (item == null) continue;
             UserAddressItemResponse row = new UserAddressItemResponse();
             row.setId(item.getId());
             row.setName(normalize(item.getName()));
             row.setPhone(normalize(item.getPhone()));
             row.setProvince(normalize(item.getProvince()));
             row.setDistrict(normalize(item.getDistrict()));
             row.setWard(normalize(item.getWard()));
             row.setAddressDetail(normalize(item.getAddressDetail()));
             row.setLatitude(item.getLatitude());
             row.setLongitude(item.getLongitude());
             row.setType(normalize(item.getType()));
             row.setIsPrimary(Boolean.TRUE.equals(item.getIsPrimary()));
             if (row.getName() == null && row.getPhone() == null && row.getProvince() == null
                 && row.getWard() == null && row.getAddressDetail() == null) {
                 continue;
             }
             out.add(row);
         }

         if (out.isEmpty()) {
             return out;
         }

         long primaryCount = out.stream().filter(x -> Boolean.TRUE.equals(x.getIsPrimary())).count();
         if (primaryCount == 0L) {
             out.get(0).setIsPrimary(true);
         } else if (primaryCount > 1L) {
             boolean seenPrimary = false;
             for (UserAddressItemResponse row : out) {
                 if (Boolean.TRUE.equals(row.getIsPrimary()) && !seenPrimary) {
                     seenPrimary = true;
                 } else {
                     row.setIsPrimary(false);
                 }
             }
         }

         return out;
     }

     private String writeAddresses(List<UserAddressItemResponse> addresses) {
         try {
             return objectMapper.writeValueAsString(addresses == null ? Collections.emptyList() : addresses);
         } catch (Exception e) {
             throw new BadRequestException("Khong the luu danh sach dia chi");
         }
     }

     private void syncLegacyAddressFromPrimary(User u, List<UserAddressItemResponse> addresses) {
         UserAddressItemResponse primary = addresses.stream()
             .filter(x -> Boolean.TRUE.equals(x.getIsPrimary()))
             .findFirst()
             .orElse(addresses.isEmpty() ? null : addresses.get(0));
         if (primary == null) {
             u.setProvince(null);
             u.setDistrict(null);
             u.setWard(null);
             u.setAddressDetail(null);
             u.setLatitude(null);
             u.setLongitude(null);
             return;
         }

         if (normalize(primary.getName()) != null) {
             u.setFullName(primary.getName());
         }
         if (normalize(primary.getPhone()) != null) {
             u.setPhone(primary.getPhone());
         }
         u.setProvince(primary.getProvince());
         u.setDistrict(primary.getDistrict());
         u.setWard(primary.getWard());
         u.setAddressDetail(primary.getAddressDetail());
         u.setLatitude(primary.getLatitude());
         u.setLongitude(primary.getLongitude());
     }
 }
