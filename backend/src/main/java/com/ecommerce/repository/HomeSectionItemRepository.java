package com.ecommerce.repository;

import com.ecommerce.model.entity.HomeSectionItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HomeSectionItemRepository extends JpaRepository<HomeSectionItem, Long> {
    List<HomeSectionItem> findBySectionKeyOrderByPositionAsc(String sectionKey);

    List<HomeSectionItem> findBySectionKeyInOrderBySectionKeyAscPositionAsc(List<String> sectionKeys);

    void deleteBySectionKey(String sectionKey);
}
