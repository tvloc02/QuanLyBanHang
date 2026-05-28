-- Drop UNIQUE constraint/index for categories.name to allow duplicate names
-- Keep categories.slug unique.

SET @db := DATABASE();

SELECT COUNT(*) INTO @has_table
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'categories';

SET @sql := NULL;

-- Find any UNIQUE index that includes column `name` (excluding PRIMARY)
SELECT CONCAT('ALTER TABLE `categories` DROP INDEX `', s.INDEX_NAME, '`;')
INTO @sql
FROM information_schema.STATISTICS s
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.TABLE_SCHEMA = s.TABLE_SCHEMA
 AND tc.TABLE_NAME = s.TABLE_NAME
 AND tc.CONSTRAINT_NAME = s.INDEX_NAME
WHERE s.TABLE_SCHEMA = @db
  AND s.TABLE_NAME = 'categories'
  AND s.COLUMN_NAME = 'name'
  AND tc.CONSTRAINT_TYPE = 'UNIQUE'
LIMIT 1;

-- Execute drop if found
SET @sql = IF(@has_table > 0 AND @sql IS NOT NULL, @sql, 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
