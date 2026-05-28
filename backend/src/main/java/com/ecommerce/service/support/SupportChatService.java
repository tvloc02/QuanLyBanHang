package com.ecommerce.service.support;

import com.ecommerce.dto.response.SupportConversationResponse;
import com.ecommerce.dto.response.SupportMessageResponse;
import com.ecommerce.exception.BadRequestException;
import com.ecommerce.model.entity.SupportConversation;
import com.ecommerce.model.entity.SupportMessage;
import com.ecommerce.model.enums.SupportConversationStatus;
import com.ecommerce.model.enums.SupportMessageSenderType;
import com.ecommerce.repository.SupportConversationRepository;
import com.ecommerce.repository.SupportMessageRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportChatService {

    private final SupportConversationRepository conversationRepository;
    private final SupportMessageRepository messageRepository;

    public SupportChatService(
        SupportConversationRepository conversationRepository,
        SupportMessageRepository messageRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public static String newGuestToken() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    @Transactional
    public SupportConversationResponse startOrGetConversation(Long userId, String guestToken) {
        SupportConversation conv;
        if (userId != null) {
            conv = conversationRepository
                .findFirstByUserIdAndStatusOrderByLastMessageAtDesc(userId, SupportConversationStatus.OPEN)
                .orElse(null);
        } else {
            String token = normalizeGuestToken(guestToken);
            conv = conversationRepository
                .findFirstByGuestTokenAndStatusOrderByLastMessageAtDesc(token, SupportConversationStatus.OPEN)
                .orElse(null);
        }

        if (conv != null) {
            return toConversationResponse(conv);
        }

        SupportConversation created = new SupportConversation();
        created.setUserId(userId);
        created.setGuestToken(userId == null ? normalizeGuestToken(guestToken) : null);
        created.setStatus(SupportConversationStatus.OPEN);
        Instant now = Instant.now();
        created.setCreatedAt(now);
        created.setUpdatedAt(now);
        created.setLastMessageAt(now);
        conversationRepository.save(created);
        return toConversationResponse(created);
    }

    @Transactional
    public SupportMessageResponse customerSend(Long userId, String guestToken, String message) {
        String msg = normalizeMessage(message);
        SupportConversationResponse conv = startOrGetConversation(userId, guestToken);

        Long convId = conv.getId();
        if (convId == null) {
            throw new BadRequestException("Conversation not found");
        }

        SupportMessage m = new SupportMessage();
        m.setConversationId(convId);
        m.setSenderType(SupportMessageSenderType.CUSTOMER);
        m.setSenderUserId(userId);
        m.setMessage(msg);
        m.setCreatedAt(Instant.now());
        messageRepository.save(m);

        SupportConversation c = conversationRepository.findById(convId)
            .orElseThrow(() -> new BadRequestException("Conversation not found"));
        Instant now = Instant.now();
        c.setUpdatedAt(now);
        c.setLastMessageAt(now);
        conversationRepository.save(c);

        return toMessageResponse(m);
    }

    public List<SupportMessageResponse> customerListMessages(Long userId, String guestToken) {
        SupportConversation conv = resolveCustomerConversationOrThrow(userId, guestToken);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId())
            .stream()
            .map(this::toMessageResponse)
            .collect(Collectors.toList());
    }

    public SupportConversationResponse customerGetConversation(Long userId, String guestToken) {
        SupportConversation conv = resolveCustomerConversationOrThrow(userId, guestToken);
        return toConversationResponse(conv);
    }

    public List<SupportConversationResponse> adminListOpenConversations() {
        return conversationRepository.findByStatusOrderByLastMessageAtDesc(SupportConversationStatus.OPEN)
            .stream()
            .map(this::toConversationResponse)
            .collect(Collectors.toList());
    }

    public List<SupportMessageResponse> adminListMessages(Long conversationId) {
        if (conversationId == null) {
            throw new BadRequestException("conversationId is required");
        }
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
            .stream()
            .map(this::toMessageResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public SupportMessageResponse adminSend(Long staffUserId, Long conversationId, String message) {
        if (conversationId == null) {
            throw new BadRequestException("conversationId is required");
        }
        String msg = normalizeMessage(message);

        SupportConversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new BadRequestException("Conversation not found"));

        if (conv.getAssignedStaffId() == null && staffUserId != null) {
            conv.setAssignedStaffId(staffUserId);
        }

        SupportMessage m = new SupportMessage();
        m.setConversationId(conversationId);
        m.setSenderType(SupportMessageSenderType.STAFF);
        m.setSenderUserId(staffUserId);
        m.setMessage(msg);
        m.setCreatedAt(Instant.now());
        messageRepository.save(m);

        Instant now = Instant.now();
        conv.setUpdatedAt(now);
        conv.setLastMessageAt(now);
        conversationRepository.save(conv);

        return toMessageResponse(m);
    }

    @Transactional
    public SupportConversationResponse adminCloseConversation(Long staffUserId, Long conversationId) {
        if (conversationId == null) {
            throw new BadRequestException("conversationId is required");
        }
        SupportConversation conv = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new BadRequestException("Conversation not found"));
        if (conv.getAssignedStaffId() == null && staffUserId != null) {
            conv.setAssignedStaffId(staffUserId);
        }
        conv.setStatus(SupportConversationStatus.CLOSED);
        conv.setUpdatedAt(Instant.now());
        conversationRepository.save(conv);
        return toConversationResponse(conv);
    }

    public List<SupportConversationResponse> adminListAll() {
        List<SupportConversation> all = conversationRepository.findAll(Sort.by(Sort.Direction.DESC, "lastMessageAt"));
        return all.stream().map(this::toConversationResponse).collect(Collectors.toList());
    }

    private SupportConversation resolveCustomerConversationOrThrow(Long userId, String guestToken) {
        SupportConversation conv;
        if (userId != null) {
            conv = conversationRepository
                .findFirstByUserIdAndStatusOrderByLastMessageAtDesc(userId, SupportConversationStatus.OPEN)
                .orElse(null);
        } else {
            String token = normalizeGuestToken(guestToken);
            conv = conversationRepository
                .findFirstByGuestTokenAndStatusOrderByLastMessageAtDesc(token, SupportConversationStatus.OPEN)
                .orElse(null);
        }
        if (conv == null) {
            throw new BadRequestException("Conversation not found");
        }
        return conv;
    }

    private String normalizeGuestToken(String guestToken) {
        String t = guestToken == null ? "" : guestToken.trim();
        if (t.isEmpty()) {
            throw new BadRequestException("guestToken is required");
        }
        if (t.length() > 64) {
            throw new BadRequestException("guestToken too long");
        }
        return t;
    }

    private String normalizeMessage(String message) {
        String msg = message == null ? "" : message.trim();
        if (msg.isEmpty()) {
            throw new BadRequestException("message is required");
        }
        return msg;
    }

    private SupportConversationResponse toConversationResponse(SupportConversation c) {
        return new SupportConversationResponse(
            c.getId(),
            c.getUserId(),
            c.getGuestToken(),
            c.getStatus(),
            c.getAssignedStaffId(),
            c.getCreatedAt(),
            c.getUpdatedAt(),
            c.getLastMessageAt()
        );
    }

    private SupportMessageResponse toMessageResponse(SupportMessage m) {
        return new SupportMessageResponse(
            m.getId(),
            m.getConversationId(),
            m.getSenderType(),
            m.getSenderUserId(),
            m.getMessage(),
            m.getCreatedAt()
        );
    }
}
