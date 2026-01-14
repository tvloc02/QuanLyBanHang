 package com.ecommerce.controller.payment;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/payments")
 public class PaymentController {
 
     @GetMapping
     public ResponseEntity<String> list() {
         return ResponseEntity.ok("OK");
     }
 }
