-- ============================================
-- 迁移 0002: 搜索日志 & 待爬取队列
-- ============================================

-- 搜索日志表：记录每次用户搜索的关键词和时间
-- 用于 Cron 定时任务分析高频未覆盖商品
CREATE TABLE IF NOT EXISTS search_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  query_text  TEXT NOT NULL,                          -- 用户搜索关键词
  query_hash  TEXT NOT NULL,                          -- 关键词 SHA256 哈希
  intent      TEXT,                                   -- LLM 返回的 intent (product/category)
  product_name TEXT,                                  -- LLM 识别的商品名（如有）
  created_at  INTEGER NOT NULL                        -- 搜索时间 (Unix ms)
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created_at
  ON search_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_search_logs_query_text
  ON search_logs(query_text);

-- 待爬取队列：Cron 任务发现的"高频搜索但知识库未覆盖"商品
-- status 含义: pending=待处理, crawling=爬取中, done=已补充, skipped=人工跳过
CREATE TABLE IF NOT EXISTS pending_crawls (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  query_text    TEXT NOT NULL UNIQUE,                 -- 搜索关键词（去重）
  search_count  INTEGER NOT NULL DEFAULT 1,           -- 近7天搜索次数
  reason        TEXT NOT NULL DEFAULT '知识库无匹配',  -- 标记原因
  status        TEXT NOT NULL DEFAULT 'pending'        -- 状态：pending/crawling/done/skipped
                CHECK(status IN ('pending','crawling','done','skipped')),
  first_seen_at INTEGER NOT NULL,                     -- 首次发现时间 (Unix ms)
  last_seen_at  INTEGER NOT NULL,                     -- 最近一次发现时间 (Unix ms)
  created_at    INTEGER NOT NULL,                     -- 记录创建时间 (Unix ms)
  updated_at    INTEGER                               -- 最后更新时间 (Unix ms)
);

CREATE INDEX IF NOT EXISTS idx_pending_crawls_status
  ON pending_crawls(status);

CREATE INDEX IF NOT EXISTS idx_pending_crawls_search_count
  ON pending_crawls(search_count DESC);
