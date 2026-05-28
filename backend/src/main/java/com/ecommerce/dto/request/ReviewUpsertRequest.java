package com.ecommerce.dto.request;

import java.util.ArrayList;
import java.util.List;

public class ReviewUpsertRequest {

    private Long productId;
    private Integer rating;
    private String comment;
    private List<String> images = new ArrayList<>();

    public ReviewUpsertRequest() {}

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }
}
