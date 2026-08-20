CREATE TABLE IF NOT EXISTS auth_password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_auth_password_resets_token ON auth_password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_password_resets_user ON auth_password_resets(user_id);
