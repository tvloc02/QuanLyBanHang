 package com.ecommerce.controller.cart;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/cart")
 public class CartController {
 
     @GetMapping
     public ResponseEntity<String> getCart() {
         return ResponseEntity.ok("OK");
     }
 }
