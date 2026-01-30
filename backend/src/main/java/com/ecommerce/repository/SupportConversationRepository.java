package com.ecommerce.repository;

import com.ecommerce.model.entity.SupportConversation;
import com.ecommerce.model.enums.SupportConversationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportConversationRepository extends JpaRepository<SupportConversation, Long> {

    Optional<SupportConversation> findFirstByUserIdAndStatusOrderByLastMessageAtDesc(Long userId, SupportConversationStatus status);

    Optional<SupportConversation> findFirstByGuestTokenAndStatusOrderByLastMessageAtDesc(String guestToken, SupportConversationStatus status);

    List<SupportConversation> findByStatusOrderByLastMessageAtDesc(SupportConversationStatus status);
}
