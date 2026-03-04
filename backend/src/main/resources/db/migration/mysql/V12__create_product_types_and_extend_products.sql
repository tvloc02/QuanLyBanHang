CREATE TABLE IF NOT EXISTS product_types (
  id BIGINT NOT NULL AUTO_INCREMENT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  active BIT(1) NOT NULL DEFAULT b'1',
  fields_json LONGTEXT NULL,
  created_at DATETIME(6) NULL,
  updated_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_product_types_code (code)
);

ALTER TABLE products
  ADD COLUMN product_type_id BIGINT NULL,
  ADD COLUMN gender VARCHAR(32) NULL,
  ADD COLUMN attributes_json LONGTEXT NULL;
