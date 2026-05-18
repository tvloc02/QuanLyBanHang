ALTER TABLE coupons
  ADD COLUMN target_user_ids VARCHAR(2000) NULL AFTER allowed_segments;
