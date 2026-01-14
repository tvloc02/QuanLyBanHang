 package com.ecommerce.controller.product;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/reviews")
 public class ReviewController {
 
     @GetMapping
     public ResponseEntity<String> list() {
         return ResponseEntity.ok("OK");
     }
 }
