 package com.ecommerce.controller.product;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/search")
 public class SearchController {
 
     @GetMapping
     public ResponseEntity<String> search() {
         return ResponseEntity.ok("OK");
     }
 }
