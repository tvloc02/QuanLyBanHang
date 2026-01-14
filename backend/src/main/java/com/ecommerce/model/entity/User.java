 package com.ecommerce.model.entity;
 
 import com.ecommerce.model.enums.UserRole;
 import jakarta.persistence.CollectionTable;
 import jakarta.persistence.Column;
 import jakarta.persistence.ElementCollection;
 import jakarta.persistence.EnumType;
 import jakarta.persistence.Enumerated;
 import jakarta.persistence.GeneratedValue;
 import jakarta.persistence.GenerationType;
 import jakarta.persistence.Id;
 import jakarta.persistence.JoinColumn;
 import jakarta.persistence.Table;
 import jakarta.persistence.Entity;
 import java.time.Instant;
 import java.util.HashSet;
 import java.util.Set;
 
 @Entity
 @Table(name = "users")
 public class User {
 
     @Id
     @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;
 
     private String fullName;
 
     @Column(unique = true)
     private String email;
 
     @Column(unique = true)
     private String username;
 
     private String password;
 
     @Column(unique = true)
     private String phone;
 
     private String province;
 
     private String ward;
 
     private String addressDetail;
 
     @ElementCollection
     @CollectionTable(name = "user_roles", joinColumns = @JoinColumn(name = "user_id"))
     @Enumerated(EnumType.STRING)
     @Column(name = "role")
     private Set<UserRole> roles = new HashSet<>();
 
     private String oauthProvider;
 
     @Column(unique = true)
     private String oauthProviderId;
 
     private Boolean enabled = true;
 
     private Instant createdAt;
 
     private Instant updatedAt;
 
     public User() {}
 
     public Long getId() {
         return id;
     }
 
     public void setId(Long id) {
         this.id = id;
     }
 
     public String getFullName() {
         return fullName;
     }
 
     public void setFullName(String fullName) {
         this.fullName = fullName;
     }
 
     public String getEmail() {
         return email;
     }
 
     public void setEmail(String email) {
         this.email = email;
     }
 
     public String getUsername() {
         return username;
     }
 
     public void setUsername(String username) {
         this.username = username;
     }
 
     public String getPassword() {
         return password;
     }
 
     public void setPassword(String password) {
         this.password = password;
     }
 
     public String getPhone() {
         return phone;
     }
 
     public void setPhone(String phone) {
         this.phone = phone;
     }
 
     public String getProvince() {
         return province;
     }
 
     public void setProvince(String province) {
         this.province = province;
     }
 
     public String getWard() {
         return ward;
     }
 
     public void setWard(String ward) {
         this.ward = ward;
     }
 
     public String getAddressDetail() {
         return addressDetail;
     }
 
     public void setAddressDetail(String addressDetail) {
         this.addressDetail = addressDetail;
     }
 
     public Set<UserRole> getRoles() {
         return roles;
     }
 
     public void setRoles(Set<UserRole> roles) {
         this.roles = roles;
     }
 
     public String getOauthProvider() {
         return oauthProvider;
     }
 
     public void setOauthProvider(String oauthProvider) {
         this.oauthProvider = oauthProvider;
     }
 
     public String getOauthProviderId() {
         return oauthProviderId;
     }
 
     public void setOauthProviderId(String oauthProviderId) {
         this.oauthProviderId = oauthProviderId;
     }
 
     public Boolean getEnabled() {
         return enabled;
     }
 
     public void setEnabled(Boolean enabled) {
         this.enabled = enabled;
     }
 
     public Instant getCreatedAt() {
         return createdAt;
     }
 
     public void setCreatedAt(Instant createdAt) {
         this.createdAt = createdAt;
     }
 
     public Instant getUpdatedAt() {
         return updatedAt;
     }
 
     public void setUpdatedAt(Instant updatedAt) {
         this.updatedAt = updatedAt;
     }
 }
