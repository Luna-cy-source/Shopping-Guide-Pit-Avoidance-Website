-- 排雷曝光台帖子表
-- UGC 模式：用户提交排雷信息，status=verified 后在前台公开展示
CREATE TABLE IF NOT EXISTS expose_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  pit_title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','rejected')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expose_posts_status ON expose_posts(status);
CREATE INDEX IF NOT EXISTS idx_expose_posts_product ON expose_posts(product_name);
CREATE INDEX IF NOT EXISTS idx_expose_posts_created ON expose_posts(created_at DESC);
