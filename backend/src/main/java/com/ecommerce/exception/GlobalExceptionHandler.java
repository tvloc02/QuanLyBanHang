package com.ecommerce.exception;

import com.ecommerce.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiResponse<Void>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(ApiResponse.fail(ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String message = "Validation error";
        if (ex.getBindingResult() != null && ex.getBindingResult().getFieldError() != null) {
            message = ex.getBindingResult().getFieldError().getDefaultMessage();
        }
        return ResponseEntity.badRequest().body(ApiResponse.fail(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAny(Exception ex) {
        ex.printStackTrace();

        String cls = ex.getClass() != null ? ex.getClass().getSimpleName() : "Exception";
        String msg = ex.getMessage();
        String text = (msg == null || msg.isBlank()) ? cls : (cls + ": " + msg);

        Throwable cause = ex.getCause();
        if (cause != null) {
            String ccls = cause.getClass() != null ? cause.getClass().getSimpleName() : "Throwable";
            String cmsg = cause.getMessage();
            String ctext = (cmsg == null || cmsg.isBlank()) ? ccls : (ccls + ": " + cmsg);
            text = text + " | cause=" + ctext;
        }

        return ResponseEntity.internalServerError().body(ApiResponse.fail(text));
    }
}
