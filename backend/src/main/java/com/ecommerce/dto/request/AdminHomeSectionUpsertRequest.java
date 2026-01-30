package com.ecommerce.dto.request;

import java.util.ArrayList;
import java.util.List;

public class AdminHomeSectionUpsertRequest {

    private String title;

    private Boolean enabled;

    private List<AdminHomeSectionItemUpsertRequest> items = new ArrayList<>();

    public AdminHomeSectionUpsertRequest() {}

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

    public List<AdminHomeSectionItemUpsertRequest> getItems() {
        return items;
    }

    public void setItems(List<AdminHomeSectionItemUpsertRequest> items) {
        this.items = items;
    }
}
