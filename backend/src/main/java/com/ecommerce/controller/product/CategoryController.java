 package com.ecommerce.controller.product;
 
 import com.ecommerce.dto.request.CategoryUpsertRequest;
 import com.ecommerce.dto.response.ApiResponse;
 import com.ecommerce.dto.response.CategoryResponse;
 import com.ecommerce.service.product.CategoryService;
 import jakarta.validation.Valid;
 import java.util.List;
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.DeleteMapping;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.PathVariable;
 import org.springframework.web.bind.annotation.PostMapping;
 import org.springframework.web.bind.annotation.PutMapping;
 import org.springframework.web.bind.annotation.RequestBody;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/categories")
 public class CategoryController {
 
     private final CategoryService categoryService;
 
     public CategoryController(CategoryService categoryService) {
         this.categoryService = categoryService;
     }
 
     @GetMapping
     public ResponseEntity<ApiResponse<List<CategoryResponse>>> list() {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.list()));
     }

     @GetMapping("/tree")
     public ResponseEntity<ApiResponse<List<CategoryResponse>>> tree() {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.listTree()));
     }
 
     @GetMapping("/{id}")
     public ResponseEntity<ApiResponse<CategoryResponse>> get(@PathVariable Long id) {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.get(id)));
     }

     @GetMapping("/slug/{slug}")
     public ResponseEntity<ApiResponse<CategoryResponse>> getBySlug(@PathVariable String slug) {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.getBySlug(slug)));
     }
 
     @PostMapping
     public ResponseEntity<ApiResponse<CategoryResponse>> create(@Valid @RequestBody CategoryUpsertRequest request) {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.create(request)));
     }
 
     @PutMapping("/{id}")
     public ResponseEntity<ApiResponse<CategoryResponse>> update(
             @PathVariable Long id,
             @Valid @RequestBody CategoryUpsertRequest request
     ) {
         return ResponseEntity.ok(ApiResponse.ok(categoryService.update(id, request)));
     }
 
     @DeleteMapping("/{id}")
     public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
         categoryService.delete(id);
         return ResponseEntity.ok(ApiResponse.ok(null));
     }
 }
