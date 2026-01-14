 package com.ecommerce.controller.user;
 
 import org.springframework.http.ResponseEntity;
 import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.bind.annotation.RequestMapping;
 import org.springframework.web.bind.annotation.RestController;
 
 @RestController
 @RequestMapping("/api/oauth2")
 public class OAuth2Controller {
 
     @GetMapping("/success")
     public ResponseEntity<String> success() {
         return ResponseEntity.ok("OK");
     }
 }
