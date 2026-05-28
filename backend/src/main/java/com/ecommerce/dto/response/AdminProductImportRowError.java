package com.ecommerce.dto.response;

public class AdminProductImportRowError {

    private int rowNumber;
    private String productCode;
    private String message;

    public AdminProductImportRowError() {}

    public AdminProductImportRowError(int rowNumber, String productCode, String message) {
        this.rowNumber = rowNumber;
        this.productCode = productCode;
        this.message = message;
    }

    public int getRowNumber() {
        return rowNumber;
    }

    public void setRowNumber(int rowNumber) {
        this.rowNumber = rowNumber;
    }

    public String getProductCode() {
        return productCode;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
