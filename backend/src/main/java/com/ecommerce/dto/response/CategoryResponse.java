package com.ecommerce.dto.response;

import java.util.ArrayList;
import java.util.List;

public class CategoryResponse {

    private Long id;

    private String name;

    private String slug;

    private Long parentId;

    private String icon;

    private String description;

    private Boolean active;

    private List<CategoryResponse> children = new ArrayList<>();

    public CategoryResponse() {}

    public CategoryResponse(Long id, String name, String slug, Long parentId, String icon, String description, Boolean active) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.parentId = parentId;
        this.icon = icon;
        this.description = description;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public Long getParentId() {
        return parentId;
    }

    public void setParentId(Long parentId) {
        this.parentId = parentId;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public List<CategoryResponse> getChildren() {
        return children;
    }

    public void setChildren(List<CategoryResponse> children) {
        this.children = children;
    }
}
