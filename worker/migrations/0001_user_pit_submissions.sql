-- 用户避坑线索提交表
CREATE TABLE IF NOT EXISTS user_pit_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  pit_title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON user_pit_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_product ON user_pit_submissions(product_name);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON user_pit_submissions(status);
