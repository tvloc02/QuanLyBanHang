 package com.ecommerce.controller.order;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/invoices")
 public class InvoiceController {
 
     @GetMapping
     public ResponseEntity<String> get() {
         return ResponseEntity.ok("OK");
     }
 }
