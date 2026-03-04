-- Add branch_id to users to associate STAFF/MANAGER with a branch

SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'branch_id'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE users ADD COLUMN branch_id BIGINT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
