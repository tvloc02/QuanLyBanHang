package com.ecommerce.service.product;

import com.ecommerce.dto.request.CategoryUpsertRequest;
import com.ecommerce.dto.response.CategoryResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.exception.ResourceNotFoundException;
import com.ecommerce.model.entity.Category;
import com.ecommerce.repository.CategoryRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    public List<CategoryResponse> listTree() {
        List<Category> all = categoryRepository.findAll();
        Map<Long, CategoryResponse> byId = new HashMap<>();
        for (Category c : all) {
            CategoryResponse node = toResponse(c);
            byId.put(c.getId(), node);
        }

        List<CategoryResponse> roots = new ArrayList<>();
        for (Category c : all) {
            Long id = c.getId();
            if (id == null) {
                continue;
            }
            CategoryResponse node = byId.get(id);
            if (node == null) {
                continue;
            }

            Long pid = c.getParentId();
            if (pid == null) {
                roots.add(node);
            } else if (pid.equals(id)) {
                roots.add(node);
            } else {
                CategoryResponse parent = byId.get(pid);
                if (parent != null) {
                    if (parent.getChildren() == null) {
                        parent.setChildren(new ArrayList<>());
                    }
                    parent.getChildren().add(node);
                } else {
                    roots.add(node);
                }
            }
        }
        return roots;
    }

    public CategoryResponse get(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return toResponse(category);
    }

    public CategoryResponse getBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        return toResponse(category);
    }

    public CategoryResponse create(CategoryUpsertRequest req) {
        Category category = new Category();
        category.setName(req.getName());
        category.setSlug(normalizeSlug(req.getSlug(), req.getName()));
        category.setParentId(req.getParentId());
        category.setIcon(req.getIcon());
        category.setDescription(req.getDescription());
        if (req.getActive() != null) {
            category.setActive(req.getActive());
        }

        validateParentDepth(category.getParentId(), null);
        validateSlugUnique(category.getSlug(), null);

        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    public CategoryResponse update(Long id, CategoryUpsertRequest req) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        category.setName(req.getName());
        category.setSlug(normalizeSlug(req.getSlug(), req.getName()));
        category.setParentId(req.getParentId());
        category.setIcon(req.getIcon());
        category.setDescription(req.getDescription());
        if (req.getActive() != null) {
            category.setActive(req.getActive());
        }

        validateParentDepth(category.getParentId(), id);
        validateSlugUnique(category.getSlug(), id);

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
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getParentId(), c.getIcon(), c.getDescription(), c.getActive());
    }

    private String normalizeSlug(String slug, String name) {
        String base = (slug != null && !slug.isBlank()) ? slug : name;
        if (base == null) return null;
        String s = base.trim().toLowerCase();
        s = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD);
        s = s.replaceAll("\\p{M}+", "");
        s = s.replaceAll("[^a-z0-9]+", "-");
        s = s.replaceAll("(^-|-$)", "");
        return s;
    }

    private void validateSlugUnique(String slug, Long selfId) {
        if (slug == null || slug.isBlank()) {
            throw new BadRequestException("Slug is required");
        }
        var existing = categoryRepository.findBySlug(slug);
        if (existing.isPresent() && (selfId == null || !Objects.equals(existing.get().getId(), selfId))) {
            throw new BadRequestException("Slug already exists");
        }
    }

    private void validateParentDepth(Long parentId, Long selfId) {
        if (parentId == null) return;

        if (selfId != null && Objects.equals(parentId, selfId)) {
            throw new BadRequestException("Invalid parentId");
        }

        int depth = 1;
        Long cur = parentId;
        while (cur != null) {
            Category p = categoryRepository.findById(cur)
                .orElseThrow(() -> new BadRequestException("Parent category not found"));

            if (selfId != null && Objects.equals(p.getId(), selfId)) {
                throw new BadRequestException("Invalid parentId");
            }

            depth++;
            cur = p.getParentId();
            if (depth > 3) {
                throw new BadRequestException("Category depth must be <= 3");
            }
        }
    }
}
