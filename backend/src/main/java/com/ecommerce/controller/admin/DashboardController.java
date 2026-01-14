 package com.ecommerce.controller.admin;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/admin/dashboard")
 public class DashboardController {
 
     @GetMapping
     public ResponseEntity<String> dashboard() {
         return ResponseEntity.ok("OK");
     }
 }
