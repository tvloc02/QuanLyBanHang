 package com.ecommerce.controller.user;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/users")
 public class UserController {
 
     @GetMapping("/me")
     public ResponseEntity<String> me() {
         return ResponseEntity.ok("OK");
     }
 }
