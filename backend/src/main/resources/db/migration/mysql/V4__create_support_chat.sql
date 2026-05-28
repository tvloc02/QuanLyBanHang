CREATE TABLE IF NOT EXISTS support_conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULL,
  guest_token VARCHAR(64) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  assigned_staff_id BIGINT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  last_message_at TIMESTAMP NULL,
  INDEX idx_support_conv_user (user_id),
  INDEX idx_support_conv_guest (guest_token),
  INDEX idx_support_conv_last (last_message_at)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  sender_user_id BIGINT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NULL,
  INDEX idx_support_msg_conv (conversation_id),
  CONSTRAINT fk_support_msg_conv FOREIGN KEY (conversation_id) REFERENCES support_conversations(id) ON DELETE CASCADE
);
