package com.ecommerce.controller.admin;

import com.ecommerce.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminHomeController {

    // In production, this should be stored in database
    private Map<String, Object> homeConfig = new HashMap<>();

    @GetMapping("/home-config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHomeConfig() {
        // Return default config if empty
        if (homeConfig.isEmpty()) {
            homeConfig = getDefaultConfig();
        }
        return ResponseEntity.ok(ApiResponse.ok(homeConfig));
    }

    @PostMapping("/home-config")
    public ResponseEntity<ApiResponse<Map<String, Object>>> saveHomeConfig(@RequestBody Map<String, Object> config) {
        this.homeConfig = config;
        return ResponseEntity.ok(ApiResponse.ok(homeConfig));
    }

    private Map<String, Object> getDefaultConfig() {
        Map<String, Object> config = new HashMap<>();
        
        // Hero section
        Map<String, String> hero = new HashMap<>();
        hero.put("title", "ĐÓN TẾT SỚM");
        hero.put("subtitle", "SALE UP TO 50% - Voucher đến 200K | Freeship");
        hero.put("ctaText", "MUA NGAY");
        hero.put("ctaRoute", "/sale");
        hero.put("imageUrl", "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1400&q=80");
        config.put("hero", hero);
        
        // Featured section
        config.put("featuredTitle", "ĐƯỢC YÊU THÍCH NHẤT");
        config.put("featuredProducts", new Object[0]);
        
        // Hot section
        config.put("hotTitle", "SẢN PHẨM HOT NHẤT");
        config.put("hotProducts", new Object[0]);
        
        // Category groups
        config.put("categoryGroups", new Object[0]);
        
        return config;
    }
}
