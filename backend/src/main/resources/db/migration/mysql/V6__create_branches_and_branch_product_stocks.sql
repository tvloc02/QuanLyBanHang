CREATE TABLE IF NOT EXISTS branches (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  manager_user_id BIGINT NULL,
  address VARCHAR(500) NULL,
  province VARCHAR(255) NULL,
  district VARCHAR(255) NULL,
  ward VARCHAR(255) NULL,
  latitude DOUBLE NULL,
  longitude DOUBLE NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_branches_code (code),
  INDEX idx_branches_manager (manager_user_id)
);

CREATE TABLE IF NOT EXISTS branch_product_stocks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  branch_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_branch_product (branch_id, product_id),
  INDEX idx_bps_branch (branch_id),
  INDEX idx_bps_product (product_id),
  CONSTRAINT fk_bps_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_bps_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
);
