ALTER TABLE paysafe_users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
CREATE INDEX IF NOT EXISTS idx_paysafe_users_role ON paysafe_users(role);
