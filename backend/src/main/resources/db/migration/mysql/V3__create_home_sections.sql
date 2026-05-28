CREATE TABLE IF NOT EXISTS home_sections (
  section_key VARCHAR(64) NOT NULL,
  title VARCHAR(255) NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (section_key)
);

CREATE TABLE IF NOT EXISTS home_section_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  section_key VARCHAR(64) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  item_type VARCHAR(32) NOT NULL,

  ref_id BIGINT NULL,

  title VARCHAR(255) NULL,
  description VARCHAR(500) NULL,
  image_url VARCHAR(500) NULL,
  route VARCHAR(500) NULL,

  code VARCHAR(128) NULL,
  note VARCHAR(255) NULL,
  button_text VARCHAR(64) NULL,

  PRIMARY KEY (id),
  INDEX idx_home_section_items_section_pos (section_key, position),
  CONSTRAINT fk_home_section_items_section
    FOREIGN KEY (section_key) REFERENCES home_sections(section_key)
    ON DELETE CASCADE
);

INSERT IGNORE INTO home_sections (section_key, title, enabled)
VALUES
  ('FEATURED', 'Được yêu thích nhất', TRUE),
  ('HOT', 'Sản phẩm hot mỗi ngày', TRUE),
  ('EXCLUSIVE', 'Độc quyền online', TRUE),
  ('CART_SAVING', 'Giỏ hàng tiết kiệm', TRUE),
  ('VOUCHERS', 'Voucher độc quyền online', TRUE),
  ('NEWS', 'Tin tức', TRUE);
