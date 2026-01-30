SET @latitude_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'latitude'
);

SET @sql_latitude := IF(
  @latitude_exists = 0,
  'ALTER TABLE users ADD COLUMN latitude DOUBLE NULL',
  'SELECT 1'
);

PREPARE stmt_latitude FROM @sql_latitude;
EXECUTE stmt_latitude;
DEALLOCATE PREPARE stmt_latitude;

SET @longitude_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'longitude'
);

SET @sql_longitude := IF(
  @longitude_exists = 0,
  'ALTER TABLE users ADD COLUMN longitude DOUBLE NULL',
  'SELECT 1'
);

PREPARE stmt_longitude FROM @sql_longitude;
EXECUTE stmt_longitude;
DEALLOCATE PREPARE stmt_longitude;
