/**
 * ============================================
 * AI 检索服务 — 混合检索（Hybrid Search）
 *
 * 策略：
 *   1. 正则提取 query 中的明确型号（英文+数字组合）
 *   2. 若提取到型号 → D1 关键词精准查询（search_cache 缓存匹配 + search_logs 历史查询）
 *   3. Vectorize 语义向量检索（原逻辑）
 *   4. 去重合并 → 组装 context 喂给 DeepSeek
 * ============================================
 */

import type { Ai } from '@cloudflare/workers-types';
import type { Env } from './types';

// ============================================
// 正则：从查询中提取型号关键词
// ============================================
const MODEL_PATTERNS: RegExp[] = [
  // 大写字母 + 数字 + 可选字母/数字 (如 DJI4Pro, RC2, A7M4, RTX4090)
  /([A-Z]{2,}[-\s]?\d{1,4}[A-Za-z]*\d*)/g,
  // 大写开头 + 空格/连字符 + 数字 (如 iPhone 17, Mini 4 Pro, Mate 60)
  /([A-Z][a-z]+[-\s]+\d{1,3}[-\s]?[A-Za-z]*\d*)/g,
  // 纯数字型号 (如 14S, 5800X3D)
  /(\d{2,4}[A-Za-z]{1,4}\b)/g,
];

/**
 * 从查询文本中提取明确的型号/商品代号
 */
function extractModelKeys(query: string): string[] {
  const keys = new Set<string>();
  for (const pattern of MODEL_PATTERNS) {
    for (const match of query.matchAll(pattern)) {
      const raw = match[0].trim();
      // 过滤太短的匹配（如单独的 "A"、"1"）
      if (raw.length >= 2) {
        keys.add(raw);
      }
    }
  }
  return [...keys].slice(0, 5); // 最多保留 5 个型号关键词
}

// ============================================
// D1 关键词检索：通过型号 LIKE 精准匹配
// ============================================

/**
 * 从 D1 search_cache 中检索包含该型号关键词的缓存响应
 * 缓存响应是之前大模型生成的完整 JSON，作为高质量上下文
 */
async function d1CacheSearch(
  db: D1Database,
  modelKeys: string[],
): Promise<string[]> {
  const hits: string[] = [];
  const seen = new Set<string>();

  // 并行查询所有型号，而非串行逐个
  const results = await Promise.all(
    modelKeys.map(async (key) => {
      try {
        const result = await db
          .prepare(
            `SELECT response_json FROM search_cache
             WHERE response_json LIKE ?1
             ORDER BY created_at DESC
             LIMIT 3`,
          )
          .bind(`%${key}%`)
          .all();
        return (result.results as { response_json: string }[]) ?? [];
      } catch (err) {
        console.error(`[D1缓存检索] 型号 "${key}" 查询失败:`, err);
        return [];
      }
    }),
  );

  for (const rows of results) {
    for (const row of rows) {
      const json = row.response_json;
      if (json && !seen.has(json.slice(0, 80))) {
        seen.add(json.slice(0, 80));
        hits.push(json);
      }
    }
  }

  return hits;
}

/**
 * 从 D1 search_logs 中查找历史相似查询
 * 用于发现之前用户对同类商品的搜索记录
 */
async function d1LogsSearch(
  db: D1Database,
  modelKeys: string[],
): Promise<string[]> {
  const similarQueries = new Set<string>();

  // 并行查询所有型号
  const results = await Promise.all(
    modelKeys.map(async (key) => {
      try {
        const result = await db
          .prepare(
            `SELECT DISTINCT query_text FROM search_logs
             WHERE query_text LIKE ?1
             ORDER BY created_at DESC
             LIMIT 5`,
          )
          .bind(`%${key}%`)
          .all();
        return (result.results as { query_text: string }[]) ?? [];
      } catch (err) {
        console.error(`[D1日志检索] 型号 "${key}" 查询失败:`, err);
        return [];
      }
    }),
  );

  for (const rows of results) {
    for (const row of rows) {
      if (row.query_text) {
        similarQueries.add(row.query_text);
      }
    }
  }

  return [...similarQueries];
}

// ============================================
// 从 D1 缓存 JSON 中提取摘要文本
// ============================================

/**
 * 将缓存响应的 JSON 字符串解析并提取核心摘要
 * 只保留最有价值的字段（商品名、坑点、评分），去除冗余
 */
function extractSummaryFromCache(cacheJson: string): string | null {
  try {
    const parsed = JSON.parse(cacheJson) as Record<string, unknown>;
    const parts: string[] = [];

    if (typeof parsed.productName === 'string') {
      parts.push(`商品：${parsed.productName}`);
    }
    if (typeof parsed.overallAssessment === 'string') {
      parts.push(`综合判断：${parsed.overallAssessment}`);
    }
    if (Array.isArray(parsed.flaws) && parsed.flaws.length > 0) {
      const flawTexts = (parsed.flaws as Array<{ title?: string; description?: string }>)
        .slice(0, 5)
        .map((f) => `• ${f.title ?? ''}: ${f.description ?? ''}`)
        .join('\n');
      parts.push(`核心坑点：\n${flawTexts}`);
    }
    if (typeof parsed.score === 'number') {
      parts.push(`风险评分：${parsed.score}/10`);
    }
    if (typeof parsed.verdict === 'string') {
      parts.push(`结论：${parsed.verdict}`);
    }

    return parts.length > 0 ? parts.join('\n') : null;
  } catch {
    // 解析失败则截取前 300 字符作为原始上下文
    return cacheJson.slice(0, 300);
  }
}

/**
 * 对提取后的摘要进行去重和拼接
 */
function deduplicateAndJoin(
  vectorContext: string,
  d1Summaries: string[],
): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  // 1. 先加入 D1 精准匹配的内容（更精准的排在前面）
  for (const summary of d1Summaries) {
    if (!summary) continue;
    const key = summary.slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      parts.push(summary);
    }
  }

  // 2. 再加入向量检索的内容
  if (vectorContext && !seen.has(vectorContext.slice(0, 60))) {
    parts.push(vectorContext);
  }

  return parts.join('\n\n---\n\n');
}

// ============================================
// 向量化 + 语义检索（原逻辑）
// ============================================

/**
 * 调用 Workers AI 将查询文本向量化
 */
async function getEmbedding(
  ai: Ai,
  text: string,
): Promise<number[] | null> {
  try {
    const embeddingResponse = (await ai.run('@cf/baai/bge-large-zh-v1.5', {
      text: [text],
    })) as { data: number[][] };
    return embeddingResponse.data[0] ?? null;
  } catch (err) {
    console.error('[向量化] 失败:', err);
    return null;
  }
}

/**
 * 对多个查询文本向量化后检索 Vectorize，合并结果
 */
async function vectorSemanticSearch(
  ai: Ai,
  vectorIndex: VectorizeIndex,
  queries: string[],
): Promise<string> {
  const allMatches: Array<{ score: number; text: string }> = [];
  const seenText = new Set<string>();

  for (const q of queries) {
    const embedding = await getEmbedding(ai, q);
    if (!embedding) continue;

    try {
      const results = await vectorIndex.query(embedding, {
        topK: 3,
        returnMetadata: true,
        returnValues: false,
      });

      for (const match of results.matches ?? []) {
        const text = match.metadata?.text as string | undefined;
        if (!text || seenText.has(text)) continue;
        seenText.add(text);
        allMatches.push({ score: match.score ?? 0, text });
      }
    } catch (err) {
      console.error('[Vectorize检索] 失败:', err);
    }
  }

  // 按相关度降序排序，取前 5 条
  allMatches.sort((a, b) => b.score - a.score);
  const top = allMatches.slice(0, 5);

  if (top.length === 0) return '';

  return top
    .map(
      (m, i) =>
        `【真实评价${i + 1}】(相关度: ${((m.score ?? 0) * 100).toFixed(1)}%)\n${m.text}`,
    )
    .join('\n\n');
}

// ============================================
// 对外导出：retrieveContext — 混合检索主函数
// ============================================

export interface RetrievalResult {
  /** 组装好的上下文文本，可直接注入 LLM prompt */
  context: string;
  /** 检索来源说明 */
  sources: {
    modelKeys: string[];
    d1CacheHits: number;
    vectorHits: number;
    historicalQueries: string[];
  };
}

/**
 * 混合检索主入口
 *
 * @param query    用户原始查询
 * @param ai       Workers AI 绑定（用于向量化）
 * @param vectorIndex Vectorize 索引绑定
 * @param db       D1 数据库绑定
 * @returns        组装好的 context 文本块
 */
export async function retrieveContext(
  query: string,
  ai: Ai,
  vectorIndex: VectorizeIndex,
  db: D1Database,
): Promise<RetrievalResult> {
  // ── 步骤 1：正则提取明确型号关键词 ──
  const modelKeys = extractModelKeys(query);
  console.log(
    `[混合检索] 提取到 ${modelKeys.length} 个型号关键词: ${modelKeys.join(', ') || '(无)'}`,
  );

  // ── 步骤 2：D1 精准关键词检索（并行） ──
  const [d1CacheResults, historicalQueries] = await Promise.all([
    modelKeys.length > 0 ? d1CacheSearch(db, modelKeys) : Promise.resolve([]),
    modelKeys.length > 0 ? d1LogsSearch(db, modelKeys) : Promise.resolve([]),
  ]);

  // 2c. 从缓存 JSON 中提取摘要
  const d1Summaries = d1CacheResults
    .map(extractSummaryFromCache)
    .filter((s): s is string => s !== null);

  // 2d. 将历史查询词也作为向量检索的补充输入
  const vectorQueries = [query, ...historicalQueries].slice(0, 5);

  // ── 步骤 3：Vectorize 语义向量检索 ──
  const vectorContext = await vectorSemanticSearch(ai, vectorIndex, vectorQueries);

  // ── 步骤 4：去重合并 ──
  const context = deduplicateAndJoin(vectorContext, d1Summaries);

  console.log(
    `[混合检索] 结果 — D1缓存命中: ${d1CacheResults.length} | 向量命中: ${vectorContext ? '是' : '否'} | 历史查询: ${historicalQueries.length}`,
  );

  return {
    context,
    sources: {
      modelKeys,
      d1CacheHits: d1CacheResults.length,
      vectorHits: vectorContext ? 1 : 0,
      historicalQueries,
    },
  };
}
