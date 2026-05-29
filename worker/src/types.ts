// ============================================
// Cloudflare Workers 环境变量 & 绑定类型
// ============================================
export interface Env {
  // ---- Worker Bindings ----
  AI: Ai;
  KNOWLEDGE_VECTOR: VectorizeIndex;
  DB: D1Database;
  IMAGE_CACHE: R2Bucket;

  // ---- 环境变量 (wrangler.toml [vars]) ----
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
}
