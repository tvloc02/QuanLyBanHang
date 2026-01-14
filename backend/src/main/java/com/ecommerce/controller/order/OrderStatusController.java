 package com.ecommerce.controller.order;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/order-status")
 public class OrderStatusController {
 
     @GetMapping
     public ResponseEntity<String> list() {
         return ResponseEntity.ok("OK");
     }
 }
