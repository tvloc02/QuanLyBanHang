package com.ecommerce.controller.admin;

import com.ecommerce.dto.request.AdminHomeSectionUpsertRequest;
import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.HomeSectionResponse;
import com.ecommerce.service.home.HomeSectionService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/home-sections")
public class AdminHomeSectionsController {

    private final HomeSectionService homeSectionService;

    public AdminHomeSectionsController(HomeSectionService homeSectionService) {
        this.homeSectionService = homeSectionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<HomeSectionResponse>>> list() {
        try {
            return ResponseEntity.ok(ApiResponse.ok(homeSectionService.listAllForAdmin()));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }

    @GetMapping("/{key}")
    public ResponseEntity<ApiResponse<HomeSectionResponse>> get(@PathVariable("key") String key) {
        try {
            HomeSectionResponse res = homeSectionService.getOneForAdmin(key);
            return ResponseEntity.ok(ApiResponse.ok(res));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }

    @PutMapping("/{key}")
    public ResponseEntity<ApiResponse<HomeSectionResponse>> upsert(
        @PathVariable("key") String key,
        @RequestBody AdminHomeSectionUpsertRequest req
    ) {
        try {
            HomeSectionResponse res = homeSectionService.upsertSection(key, req);
            return ResponseEntity.ok(ApiResponse.ok(res));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }
}
