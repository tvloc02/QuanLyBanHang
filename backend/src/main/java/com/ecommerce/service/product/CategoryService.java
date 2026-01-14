package com.ecommerce.service.product;

import com.ecommerce.dto.request.CategoryUpsertRequest;
import com.ecommerce.dto.response.CategoryResponse;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Category;
import com.ecommerce.repository.CategoryRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> list() {
        return categoryRepository.findAll().stream().map(CategoryService::toResponse).toList();
    }

    public CategoryResponse get(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return toResponse(category);
    }

    public CategoryResponse create(CategoryUpsertRequest req) {
        Category category = new Category();
        category.setName(req.getName());
        category.setDescription(req.getDescription());
        if (req.getActive() != null) {
            category.setActive(req.getActive());
        }
        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    public CategoryResponse update(Long id, CategoryUpsertRequest req) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        category.setName(req.getName());
        category.setDescription(req.getDescription());
        if (req.getActive() != null) {
            category.setActive(req.getActive());
        }
        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    public void delete(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found");
        }
        categoryRepository.deleteById(id);
    }

    private static CategoryResponse toResponse(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), c.getActive());
    }
}
