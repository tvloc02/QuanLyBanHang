package com.ecommerce.repository;

import com.ecommerce.model.entity.HomeSection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeSectionRepository extends JpaRepository<HomeSection, String> {
}
