 package com.ecommerce.controller.user;
 
 import com.ecommerce.dto.request.UserMeUpdateRequest;
 import com.ecommerce.dto.response.ApiResponse;
 import com.ecommerce.dto.response.UserMeResponse;
 import com.ecommerce.exception.BadRequestException;
 import com.ecommerce.exception.ResourceNotFoundException;
 import com.ecommerce.model.entity.User;
 import com.ecommerce.repository.UserRepository;
 import com.ecommerce.security.SecurityUtils;
 import java.time.Instant;
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.PutMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RequestBody;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/users")
 public class UserController {
 
     private final UserRepository userRepository;

     public UserController(UserRepository userRepository) {
         this.userRepository = userRepository;
     }

     @GetMapping("/me")
     public ResponseEntity<ApiResponse<UserMeResponse>> me() {
         Long userId = SecurityUtils.currentUserId();
         if (userId == null) {
             throw new BadRequestException("Unauthorized");
         }
         User u = userRepository.findById(userId)
             .orElseThrow(() -> new ResourceNotFoundException("User not found"));
         return ResponseEntity.ok(ApiResponse.ok(toMe(u)));
     }

     @PutMapping("/me")
     public ResponseEntity<ApiResponse<UserMeResponse>> updateMe(@RequestBody UserMeUpdateRequest request) {
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
        u.setUpdatedAt(Instant.now());

        u = userRepository.save(u);
        return ResponseEntity.ok(ApiResponse.ok(toMe(u)));
      }

      private static String normalize(String s) {
          if (s == null) return null;
          String t = s.trim();
          return t.isEmpty() ? null : t;
      }

      private static UserMeResponse toMe(User u) {
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
          out.setBranchId(u.getBranchId());
          out.setCreatedAt(u.getCreatedAt());
          out.setUpdatedAt(u.getUpdatedAt());
          return out;
      }
  }
