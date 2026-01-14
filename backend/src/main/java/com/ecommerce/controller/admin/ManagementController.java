 package com.ecommerce.controller.admin;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/admin")
 public class ManagementController {
 
     @GetMapping("/health")
     public ResponseEntity<String> health() {
         return ResponseEntity.ok("OK");
     }
 }
