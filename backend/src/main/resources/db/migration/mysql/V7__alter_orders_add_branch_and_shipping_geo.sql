-- Add branch assignment + shipping geo fields to orders

SET @branch_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'branch_id'
);

SET @sql_branch_id := IF(
  @branch_id_exists = 0,
  'ALTER TABLE orders ADD COLUMN branch_id BIGINT NULL',
  'SELECT 1'
);

PREPARE stmt_branch_id FROM @sql_branch_id;
EXECUTE stmt_branch_id;
DEALLOCATE PREPARE stmt_branch_id;

SET @ship_lat_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'shipping_latitude'
);

SET @sql_ship_lat := IF(
  @ship_lat_exists = 0,
  'ALTER TABLE orders ADD COLUMN shipping_latitude DOUBLE NULL',
  'SELECT 1'
);

PREPARE stmt_ship_lat FROM @sql_ship_lat;
EXECUTE stmt_ship_lat;
DEALLOCATE PREPARE stmt_ship_lat;

SET @ship_lng_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'shipping_longitude'
);

SET @sql_ship_lng := IF(
  @ship_lng_exists = 0,
  'ALTER TABLE orders ADD COLUMN shipping_longitude DOUBLE NULL',
  'SELECT 1'
);

PREPARE stmt_ship_lng FROM @sql_ship_lng;
EXECUTE stmt_ship_lng;
DEALLOCATE PREPARE stmt_ship_lng;

SET @ship_dist_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'shipping_distance_km'
);

SET @sql_ship_dist := IF(
  @ship_dist_exists = 0,
  'ALTER TABLE orders ADD COLUMN shipping_distance_km DOUBLE NULL',
  'SELECT 1'
);

PREPARE stmt_ship_dist FROM @sql_ship_dist;
EXECUTE stmt_ship_dist;
DEALLOCATE PREPARE stmt_ship_dist;

-- Ensure order_items.product_id uses BIGINT for joining with products/branch stock
SET @order_item_pid_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'order_items'
    AND COLUMN_NAME = 'product_id'
);

SET @sql_order_item_pid := IF(
  @order_item_pid_exists = 1,
  'ALTER TABLE order_items MODIFY COLUMN product_id BIGINT NULL',
  'SELECT 1'
);

PREPARE stmt_order_item_pid FROM @sql_order_item_pid;
EXECUTE stmt_order_item_pid;
DEALLOCATE PREPARE stmt_order_item_pid;
