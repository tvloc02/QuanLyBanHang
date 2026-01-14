 package com.ecommerce.controller.user;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/profile")
 public class ProfileController {
 
     @GetMapping
     public ResponseEntity<String> get() {
         return ResponseEntity.ok("OK");
     }
 }
