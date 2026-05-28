package com.ecommerce.controller.location;

import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.service.location.LocationService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/locations")
public class LocationsController {

    private final LocationService locationService;

    public LocationsController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/vn-depth3")
    public ResponseEntity<ApiResponse<Object>> vnDepth3() {
        try {
            return ResponseEntity.ok(ApiResponse.ok(locationService.vnDepth3()));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }

    @GetMapping("/vn2")
    public ResponseEntity<ApiResponse<Object>> vn2(@RequestParam(value = "provinceCode", required = false) String provinceCode) {
        try {
            if (provinceCode == null || provinceCode.trim().isEmpty()) {
                return ResponseEntity.ok(ApiResponse.ok(locationService.vn2Provinces()));
            }
            return ResponseEntity.ok(ApiResponse.ok(locationService.vn2CommunesByProvince(provinceCode.trim())));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }

    @GetMapping("/reverse-geocode")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reverseGeocode(
        @RequestParam("lat") double lat,
        @RequestParam("lng") double lng
    ) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(locationService.reverseGeocode(lat, lng)));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }

    @GetMapping("/search-geocode")
    public ResponseEntity<ApiResponse<Object>> searchGeocode(@RequestParam("q") String query) {
        try {
            return ResponseEntity.ok(ApiResponse.ok(locationService.searchGeocode(query)));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }
}
