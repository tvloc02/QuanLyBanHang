CREATE TABLE IF NOT EXISTS branch_product_variant_stocks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  branch_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  color VARCHAR(255) NOT NULL,
  size VARCHAR(64) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(1000) NULL,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bpvs (branch_id, product_id, color, size),
  INDEX idx_bpvs_branch (branch_id),
  INDEX idx_bpvs_product (product_id),
  CONSTRAINT fk_bpvs_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bpvs_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
);
