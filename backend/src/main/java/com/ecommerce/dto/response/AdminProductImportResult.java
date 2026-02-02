package com.ecommerce.dto.response;

import java.util.ArrayList;
import java.util.List;

public class AdminProductImportResult {

    private int total;
    private int successCount;
    private int errorCount;
    private String errorFileUrl;
    private List<AdminProductImportRowError> errors = new ArrayList<>();

    public AdminProductImportResult() {}

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getSuccessCount() {
        return successCount;
    }

    public void setSuccessCount(int successCount) {
        this.successCount = successCount;
    }

    public int getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(int errorCount) {
        this.errorCount = errorCount;
    }

    public String getErrorFileUrl() {
        return errorFileUrl;
    }

    public void setErrorFileUrl(String errorFileUrl) {
        this.errorFileUrl = errorFileUrl;
    }

    public List<AdminProductImportRowError> getErrors() {
        return errors;
    }

    public void setErrors(List<AdminProductImportRowError> errors) {
        this.errors = errors;
    }
}
