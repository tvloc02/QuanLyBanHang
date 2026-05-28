ALTER TABLE coupons
  ADD COLUMN type VARCHAR(32) NULL AFTER description;

UPDATE coupons
SET type = CASE
  WHEN shipping_discount_amount IS NOT NULL AND shipping_discount_amount > 0 THEN 'customer_shipping'
  ELSE 'customer_segment'
END
WHERE type IS NULL OR TRIM(type) = '';

ALTER TABLE coupons
  MODIFY COLUMN type VARCHAR(32) NOT NULL;
