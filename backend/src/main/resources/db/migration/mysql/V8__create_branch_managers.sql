CREATE TABLE IF NOT EXISTS branch_managers (
  id BIGINT NOT NULL AUTO_INCREMENT,
  branch_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_branch_manager (branch_id, user_id),
  INDEX idx_branch_managers_branch (branch_id),
  INDEX idx_branch_managers_user (user_id),
  CONSTRAINT fk_branch_managers_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_branch_managers_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

INSERT IGNORE INTO branch_managers (branch_id, user_id)
SELECT id, manager_user_id
FROM branches
WHERE manager_user_id IS NOT NULL;
