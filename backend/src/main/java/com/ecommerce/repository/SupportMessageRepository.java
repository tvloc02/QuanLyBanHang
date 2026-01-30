package com.ecommerce.repository;

import com.ecommerce.model.entity.SupportMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportMessageRepository extends JpaRepository<SupportMessage, Long> {

    List<SupportMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
}
