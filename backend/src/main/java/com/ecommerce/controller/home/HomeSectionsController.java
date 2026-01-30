package com.ecommerce.controller.home;

import com.ecommerce.dto.response.ApiResponse;
import com.ecommerce.dto.response.HomeSectionResponse;
import com.ecommerce.service.home.HomeSectionService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home-sections")
public class HomeSectionsController {

    private final HomeSectionService homeSectionService;

    public HomeSectionsController(HomeSectionService homeSectionService) {
        this.homeSectionService = homeSectionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<HomeSectionResponse>>> list() {
        try {
            return ResponseEntity.ok(ApiResponse.ok(homeSectionService.listPublic()));
        } catch (Exception ex) {
            return ResponseEntity.ok(ApiResponse.fail(ex.getMessage() != null ? ex.getMessage() : "Internal Server Error"));
        }
    }
}
