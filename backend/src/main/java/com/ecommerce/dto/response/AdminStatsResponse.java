package com.ecommerce.dto.response;

public class AdminStatsResponse {

    private long users;

    private long products;

    private long categories;

    private long orders;

    private long coupons;

    private long reviews;

    public AdminStatsResponse() {}

    public AdminStatsResponse(long users, long products, long categories, long orders, long coupons, long reviews) {
        this.users = users;
        this.products = products;
        this.categories = categories;
        this.orders = orders;
        this.coupons = coupons;
        this.reviews = reviews;
    }

    public long getUsers() {
        return users;
    }

    public void setUsers(long users) {
        this.users = users;
    }

    public long getProducts() {
        return products;
    }

    public void setProducts(long products) {
        this.products = products;
    }

    public long getCategories() {
        return categories;
    }

    public void setCategories(long categories) {
        this.categories = categories;
    }

    public long getOrders() {
        return orders;
    }

    public void setOrders(long orders) {
        this.orders = orders;
    }

    public long getCoupons() {
        return coupons;
    }

    public void setCoupons(long coupons) {
        this.coupons = coupons;
    }

    public long getReviews() {
        return reviews;
    }

    public void setReviews(long reviews) {
        this.reviews = reviews;
    }
}
