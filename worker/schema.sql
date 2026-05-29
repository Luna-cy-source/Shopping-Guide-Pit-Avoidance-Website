-- ============================================
-- AI避坑导购 数据库 Schema (Cloudflare D1)
-- ============================================

-- 搜索缓存表：缓存大模型分析结果，减少重复调用
CREATE TABLE IF NOT EXISTS search_cache (
    query_hash  TEXT PRIMARY KEY,                -- 查询词的 SHA256 哈希值，作为主键
    response_json TEXT NOT NULL,                 -- 大模型完整响应 JSON
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')) -- 缓存创建时间
);

-- 为 created_at 创建索引，便于清理过期缓存
CREATE INDEX IF NOT EXISTS idx_search_cache_created_at
    ON search_cache(created_at);

-- 坑点反馈表：用户对分析的坑点进行投票/反馈
CREATE TABLE IF NOT EXISTS flaw_feedback (
    id          INTEGER PRIMARY KEY AUTOINCREMENT, -- 自增主键
    query       TEXT NOT NULL,                     -- 用户原始查询
    flaw_title  TEXT NOT NULL,                     -- 被反馈的坑点标题
    vote        INTEGER NOT NULL CHECK(vote IN (-1, 0, 1)), -- 投票值：-1 踩, 0 中立, 1 赞
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')) -- 反馈创建时间
);

-- 为查询词创建索引，便于统计分析
CREATE INDEX IF NOT EXISTS idx_flaw_feedback_query
    ON flaw_feedback(query);

-- 为投票值创建索引，便于聚合查询
CREATE INDEX IF NOT EXISTS idx_flaw_feedback_vote
    ON flaw_feedback(vote);

-- ============================================
-- 搜索日志表：记录每次用户搜索的关键词和时间
-- 用于 Cron 定时任务分析高频未覆盖商品
-- ============================================
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

-- ============================================
-- 待爬取队列：Cron 任务发现的"高频搜索但知识库未覆盖"商品
-- ============================================
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
