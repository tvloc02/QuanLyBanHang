package com.ecommerce.dto.response;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class HomeSectionResponse {

    private String sectionKey;

    private String title;

    private Boolean enabled;

    private Instant updatedAt;

    private List<HomeSectionItemResponse> items = new ArrayList<>();

    public HomeSectionResponse() {}

    public String getSectionKey() {
        return sectionKey;
    }

    public void setSectionKey(String sectionKey) {
        this.sectionKey = sectionKey;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Boolean getEnabled() {
        return enabled;
    }

    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<HomeSectionItemResponse> getItems() {
        return items;
    }

    public void setItems(List<HomeSectionItemResponse> items) {
        this.items = items;
    }
}
