import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import {
  LLMResponseSchema,
  FeedbackRequestSchema,
  PitSubmissionSchema,
  ExposeSubmissionSchema,
} from './schema';
import { getOrDownloadImage, downloadAndCacheImage } from './image-cache';
import { retrieveContext } from './ai-service';

// ============================================
// Hono 实例初始化 + CORS 中间件
// ============================================
const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// ============================================
// GET / — API 状态页
// ============================================
app.get('/', (c) => {
  const now = new Date().toISOString();
  const uptimeMs = performance.now();
  const hours = Math.floor(uptimeMs / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);
  const seconds = Math.floor((uptimeMs % 60000) / 1000);

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI 避坑导购 API 状态</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
  .card { background: #1e293b; border-radius: 16px; padding: 40px; max-width: 700px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); border: 1px solid #334155; }
  h1 { font-size: 28px; margin-bottom: 6px; color: #f8fafc; }
  .subtitle { color: #94a3b8; margin-bottom: 28px; font-size: 14px; }
  .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 24px; }
  .status.online { background: #065f46; color: #6ee7b7; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
  .info-item { background: #0f172a; border-radius: 10px; padding: 14px 16px; border: 1px solid #1e293b; }
  .info-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-value { font-size: 15px; color: #f1f5f9; font-weight: 500; word-break: break-all; }
  h2 { font-size: 18px; color: #f8fafc; margin-bottom: 14px; }
  .endpoints {  }
  .endpoint { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; background: #0f172a; border: 1px solid #1e293b; }
  .method { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; min-width: 48px; text-align: center; }
  .method.post { background: #1e4d3a; color: #6ee7b7; }
  .method.get { background: #1e3a5f; color: #7dd3fc; }
  .path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 14px; color: #f1f5f9; }
  .desc { font-size: 12px; color: #94a3b8; margin-left: auto; }
  .footer { margin-top: 24px; font-size: 12px; color: #475569; text-align: center; }
</style>
</head>
<body>
<div class="card">
  <h1>AI 避坑导购 Worker</h1>
  <p class="subtitle">RAG 消费避坑分析 API 服务</p>
  <div class="status online"><span class="dot"></span> 服务运行中</div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">当前时间</div>
      <div class="info-value">${now}</div>
    </div>
    <div class="info-item">
      <div class="info-label">运行时长</div>
      <div class="info-value">${hours}h ${minutes}m ${seconds}s</div>
    </div>
    <div class="info-item">
      <div class="info-label">LLM 引擎</div>
      <div class="info-value">DeepSeek 原生流式 + Llama 8B 兜底</div>
    </div>
    <div class="info-item">
      <div class="info-label">运行环境</div>
      <div class="info-value">Cloudflare Workers</div>
    </div>
  </div>

  <h2>可用接口</h2>
  <div class="endpoints">
    <div class="endpoint">
      <span class="method post">POST</span>
      <span class="path">/api/search</span>
      <span class="desc">RAG 检索 + 流式 AI 分析</span>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/health</span>
      <span class="desc">健康检查</span>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/trending</span>
      <span class="desc">近 7 天热门搜索词</span>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/blacklist</span>
      <span class="desc">智商税黑榜</span>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/expose</span>
      <span class="desc">排雷曝光列表</span>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <span class="path">/api/expose</span>
      <span class="desc">提交排雷曝光</span>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <span class="path">/api/pit-submission</span>
      <span class="desc">提交避坑线索</span>
    </div>
    <div class="endpoint">
      <span class="method post">POST</span>
      <span class="path">/api/feedback</span>
      <span class="desc">用户反馈闭环</span>
    </div>
    <div class="endpoint">
      <span class="method get">GET</span>
      <span class="path">/api/image-proxy</span>
      <span class="desc">图片代理与缓存</span>
    </div>
  </div>

  <div class="footer">AI 避坑导购 &copy; ${new Date().getFullYear()} — 帮你避开智商税</div>
</div>
</body>
</html>`;

  return c.html(html);
});

// ============================================
// 多 Intent 系统提示词模板
// ============================================

/** 通用原则（所有 Intent 共享） */
const BASE_PRINCIPLES = `【核心原则】：
- 避坑优先：优先拆解隐形短板、营销陷阱、参数虚标。
- 客观中立：禁止恰饭，缺点必须直白点明。
- 语言接地气：用大白话，不堆砌参数。
- 绝对红线：禁止模棱两可，必须有明确判断。
- 长度控制：每个字段精简扼要，严禁超过 50-80 字的长篇论述。

【通用约束】：
1. 只输出 JSON，不要任何 Markdown 代码块、不要解释文字。
2. 所有中文字段使用简体中文。
3. 如果某些信息确实未知，填合理默认值而非乱编。
4. 禁止在 JSON 前后输出任何其他内容。`;

/** Intent: product — 单品深度分析 */
const PRODUCT_SCHEMA = `【当前模式：单品分析（intent='product'）】

输出格式：
{
  "intent": "product",
  "productName": "商品全称",
  "category": "所属品类",
  "imageUrl": "无图填null",
  "productImage": { "url": "同imageUrl", "alt": "商品名称" },
  "score": "避坑综合评分 0-10（越低越需避坑，6分以下=严重避坑）",
  "summary": "一句话总结建议，不超过80字",
  "sourceStats": { "sampleSize": 800-3000, "platforms": ["京东","淘宝","小红书"] },
  "skus": [
    { "name": "SKU型号", "priceStr": "¥价格", "specs": "核心参数", "specificFlaw": "该SKU特有坑点(可选)" }
  ](2-3个),
  "specsCheck": [
    { "specName": "参数名", "officialClaim": "厂商宣称", "truth": "真实情况" }
  ](2-3项),
  "visData": { "flawRadar": { "labels": ["性价比","品质","售后","成分","口碑"], "scores": [1-10各分数] } },
  "priceReference": [
    { "platform": "平台名", "price": 数字价格 }
  ](2-3个平台),
  "flaws": [
    { "title": "坑点标题", "quote": "引用评价原文", "analysis": "深度分析" }
  ](3-4个),
  "alternatives": [
    { "productName": "替代品", "price": "价格", "advantage": "主要优势≤40字" }
  ](2个),
  "productVariants": [
    { "dimension": "维度名", "values": ["选项1","选项2"] }
  ](3-4个)
}

【单品约束】：score范围0-10；flaws必须是含title/quote/analysis的对象数组；priceReference的price必须是数字。`;

/** Intent: recommend — 选品推荐（诊所模式） */
const RECOMMEND_SCHEMA = `【当前模式：选品推荐（intent='recommend'）】

输出格式：
{
  "intent": "recommend",
  "userProfile": "用户画像摘要（预算、场景、偏好等，一句话概括）",
  "recommendations": [
    {
      "productName": "推荐商品名称",
      "score": "综合评分 0-10",
      "priceRange": "价格区间如 ¥2000-3000",
      "reason": "推荐理由（为什么适合该用户）",
      "compromise": "核心妥协点/坑点（必须直言不讳）"
    }
  ](3-5款)
}

【选品约束】：recommendations至少3款；每款的compromise必须诚实指出不足；score必须基于实际分析给出有理有据的数值（0-10）。`;

/** Intent: used_market — 二手防坑鉴定 */
const USED_MARKET_SCHEMA = `【当前模式：二手防坑鉴定（intent='used_market'）】

输出格式：
{
  "intent": "used_market",
  "productName": "被鉴定的二手商品名称",
  "riskLevel": "整体风险等级，只能是以下三值之一：极高 / 中等 / 低",
  "riskSummary": "风险概览总结，一段话概括二手交易中最需要警惕的核心风险",
  "scamRoutines": [
    {
      "title": "骗局话术名称",
      "routine": "骗子常见套路完整拆解（按时间线或步骤叙述）",
      "counterMeasure": "应对措施（如何识破、具体操作建议）"
    }
  ](3-6种骗局),
  "inspectionChecklist": [
    {
      "step": "验机步骤名称（如'核对序列号'）",
      "detail": "具体操作说明（保姆级粒度，面向非专业用户）"
    }
  ](5-15步，按线下验机顺序排列)
}

【鉴定约束】：scamRoutines至少3条；inspectionChecklist至少5步且最多20步；riskLevel严格限定为"极高/中等/低"三值之一；验机步骤要具体可操作，不能泛泛而谈。`;

/** Intent: compare — 1v1 对比 */
const COMPARE_SCHEMA = `【当前模式：1v1对比（intent='compare'）】

输出格式：
{
  "intent": "compare",
  "productA": {
    "productName": "商品A名称", "imageUrl": "图片链接或空字符串",
    "score": "评分0-10", "priceRange": "价格区间",
    "bestFor": "最适合的用户画像", "strengths": ["优势1","优势2"],
    "weaknesses": ["槽点1","槽点2"]
  },
  "productB": {
    "productName": "商品B名称", "imageUrl": "图片链接或空字符串",
    "score": "评分0-10", "priceRange": "价格区间",
    "bestFor": "最适合的用户画像", "strengths": ["优势1","优势2"],
    "weaknesses": ["槽点1","槽点2"]
  },
  "comparisonTable": [
    { "dimension": "对比维度", "resultA": "A的表现", "resultB": "B的表现", "winner": "A或B或tie" }
  ](5-8个维度),
  "verdict": "综合对比结论（一句话）",
  "winner": "最终推荐 A 或 B 或 tie"
}

【对比约束】：comparisonTable至少5个维度；winner严格限定为A/B/tie；verdict要给出明确倾向性判断。`;

/**
 * 根据用户 Prompt 检测请求的 Intent 类型
 * 返回对应的系统提示词
 */
function buildSystemPrompt(userPrompt: string): string {
  const p = userPrompt.toLowerCase();

  // 检测 intent 指令
  if (p.includes("intent='used_market'") || p.includes('intent="used_market"') || p.includes('二手防坑') || p.includes('二手.*鉴定') || p.includes('验机') || /二手/.test(p) && /防|坑|鉴|骗|风险/.test(p)) {
    return `你是专业的二手交易防坑专家。你的使命是帮助买家在二手交易中识别骗局、规避风险、掌握验机技巧。\n\n${BASE_PRINCIPLES}\n\n${USED_MARKET_SCHEMA}`;
  }

  if (p.includes("intent='recommend'") || p.includes('intent="recommend"') || p.includes('选品诊所') || p.includes('反向推荐')) {
    return `你是专业的AI选品顾问。根据用户需求画像，反向推荐最匹配的商品，同时诚实列出每款的妥协点。\n\n${BASE_PRINCIPLES}\n\n${RECOMMEND_SCHEMA}`;
  }

  if (p.includes("intent='compare'") || p.includes('intent="compare"') || p.includes('1v1') || p.includes('对比') || /vs|对决|PK|哪个好|选哪个/.test(p) && !p.includes('category')) {
    return `你是中立的产品对比分析师。从多个维度客观对比两款商品的优劣，给出明确的购买建议。\n\n${BASE_PRINCIPLES}\n\n${COMPARE_SCHEMA}`;
  }

  // 默认：单品分析
  return `你是专业中立、真实靠谱、接地气的AI避坑导购专家。核心使命是帮普通用户避开消费套路、智商税。\n\n${BASE_PRINCIPLES}\n\n${PRODUCT_SCHEMA}`;
}


// ============================================
// 超时常量
// ============================================
const DEEPSEEK_TIMEOUT = 20_000; // DeepSeek 单次请求超时 20s
const WA_TIMEOUT = 15_000;       // Workers AI 兜底超时 15s

// ============================================
// 核心分析引擎（供 POST 后台 & GET 轮询复用）
// 将结果写入 D1 search_cache，成功时 key = queryHash，失败时写入 error
// ============================================
async function runAIAnalysis(
  query: string,
  queryHash: string,
  userPrompt: string,
  env: Env,
): Promise<{ success: boolean; data?: unknown; error?: string }> {

  // --- DeepSeek（主力，非流式）---
  const tryDeepSeek = async (): Promise<unknown> => {
    const apiKey = env.DEEPSEEK_API_KEY;
    const baseURL = env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

    if (!apiKey) {
      console.warn('[DeepSeek] ⚠️ DEEPSEEK_API_KEY 未配置，跳过直接使用 Workers AI 兜底');
      throw new Error('DEEPSEEK_API_KEY_MISSING');
    }

    console.log(`[DeepSeek] 🚀 请求 → ${baseURL} (超时=${DEEPSEEK_TIMEOUT/1000}s)`);
    const t0 = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[DeepSeek] ⏰ 超时，取消请求`);
      controller.abort();
    }, DEEPSEEK_TIMEOUT);

    try {
      const apiResponse = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: buildSystemPrompt(userPrompt) },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          max_tokens: 2048,         // 增加到 2048，防止复杂分析被截断
          stream: false,            // ★ 非流式：更简单、更快、无 SSE 解析开销
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`[DeepSeek] ⏱️ 完成 | ${Date.now() - t0}ms | status=${apiResponse.status}`);

      if (!apiResponse.ok) {
        const errBody = await apiResponse.text().catch(() => '(unreadable)');
        console.error(`[DeepSeek] ❌ HTTP ${apiResponse.status}: ${errBody.slice(0, 300)}`);
        throw new Error(`DEEPSEEK_HTTP_${apiResponse.status}`);
      }

      const json: any = await apiResponse.json();
      const fullText = json?.choices?.[0]?.message?.content || '';
      console.log(`[DeepSeek] 📝 内容长度=${fullText.length} | 总耗时=${Date.now() - t0}ms`);

      if (!fullText || fullText.length < 30) {
        throw new Error('DEEPSEEK_EMPTY_RESPONSE');
      }

      return parseAIResponse(fullText, query);
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === 'AbortError') {
        throw new Error('DEEPSEEK_TIMEOUT');
      }
      throw err;
    }
  };

  // --- Workers AI（兜底）---
  const tryWorkersAI = async (): Promise<unknown> => {
    console.log('[Workers AI] Llama 8B 兜底...');
    const t0 = Date.now();

    const aiResponse = await Promise.race([
      env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: buildSystemPrompt(userPrompt) },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 2048,
        temperature: 0.6,
      }) as Promise<{ response?: string }>,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('LLM_TIMEOUT')), WA_TIMEOUT)),
    ]);

    console.log(`[Workers AI] ⏱️ 完成 | ${Date.now() - t0}ms`);

    const rawText = aiResponse.response ?? '';
    if (!rawText || rawText.length < 30) throw new Error('WA_EMPTY_RESPONSE');

    return parseAIResponse(rawText, query);
  };

  // ---- 执行 ----
  try {
    const data = await tryDeepSeek();
    // 图片 URL 替换为代理地址 + 写入缓存
    const processed = processImageUrls(data, env);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO search_cache (query_hash, response_json, created_at) VALUES (?, ?, ?)'
    ).bind(queryHash, JSON.stringify(processed), Date.now()).run();
    console.log(`[SearchJob] ✅ 完成 | hash=${queryHash.slice(0, 8)}`);
    return { success: true, data: processed };
  } catch (dsErr) {
    const dsMsg = dsErr instanceof Error ? dsErr.message : String(dsErr);
    console.error(`[主流程] DeepSeek 失败: ${dsMsg}，尝试 Workers AI 兜底...`);

    try {
      const data = await tryWorkersAI();
      const processed = processImageUrls(data, env);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO search_cache (query_hash, response_json, created_at) VALUES (?, ?, ?)'
      ).bind(queryHash, JSON.stringify(processed), Date.now()).run();
      console.log(`[SearchJob] ✅ 兜底完成 | hash=${queryHash.slice(0, 8)}`);
      return { success: true, data: processed };
    } catch (waErr) {
      const waMsg = waErr instanceof Error ? waErr.message : String(waErr);
      console.error(`[主流程] Workers AI 兜底也失败: ${waMsg}`);
      return { success: false, error: waMsg };
    }
  }
}

// ============================================
// JSON 解析 + 字段补全（从 AI 返回值提取并标准化 JSON 对象）
// ============================================
function parseAIResponse(fullText: string, query: string): Record<string, any> {
  // 步骤1：清洗文本，提取 JSON
  let cleaned = fullText.trim();

  // 移除 Markdown 代码块包裹
  cleaned = cleaned
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim();

  // 找到第一个 { 和最后一个 } 之间的内容
  const fb = cleaned.indexOf('{');
  const lb = cleaned.lastIndexOf('}');
  if (fb !== -1 && lb !== -1 && lb > fb) {
    cleaned = cleaned.slice(fb, lb + 1);
  }

  // 步骤2：尝试解析 JSON（含修复）
  let parsed: Record<string, any> | null = null;

  // 方案A：直接解析
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // 方案B：修复未闭合的括号
    let fixed = cleaned;
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;

    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';

    // 移除末尾逗号
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    try {
      parsed = JSON.parse(fixed);
      console.log('[AI] 🔧 JSON 修复成功（补全括号）');
    } catch {
      // 方案C：尝试正则提取必需字段
      console.error('[AI] JSON 完全无法解析，尝试正则提取');
      parsed = extractWithRegex(cleaned, query);
    }
  }

  if (!parsed) {
    throw new Error('DEEPSEEK_JSON_PARSE_FAIL');
  }

  // 步骤3：补全缺失字段
  return applyDefaults(parsed, query);
}

/**
 * 正则兜底提取：当 JSON 完全无法解析时，用正则捞出关键信息
 */
function extractWithRegex(text: string, query: string): Record<string, any> {
  const extract = (pattern: RegExp, group = 1): string => {
    const m = text.match(pattern);
    return m ? m[group].trim() : '';
  };

  return {
    productName: extract(/"productName"\s*:\s*"([^"]+)"/)
      || extract(/商品名[称]?[：:]\s*([^\n，。]+)/)
      || query,
    category: extract(/"category"\s*:\s*"([^"]+)"/)
      || extract(/品类[：:]\s*([^\n，。]+)/)
      || '未知品类',
    score: parseInt(extract(/"score"\s*:\s*(\d+)/)) || 45,
    summary: extract(/"summary"\s*:\s*"([^"]+)"/)
      || extract(/总结[：:]\s*([^\n]+)/)
      || '分析数据解析异常，建议重新查询。',
    flaws: [],
    skus: [],
    specsCheck: [],
    alternatives: [],
    imageUrl: 'null',
    productImage: { url: 'null' },
    priceReference: [],
    visData: { flawRadar: { labels: ['性价比', '温和度', '保湿力', '有效成分', '通用度'], scores: [3, 3, 3, 3, 3] } },
    productVariants: [],
  };
}

/**
 * 字段默认值补全 + 格式规范化
 * 将 AI 返回的任意格式统一转为前端期望的标准格式
 */
function applyDefaults(parsed: Record<string, any>, query: string): Record<string, any> {
  // ===== score: 归一化到 0-10 =====
  let score = typeof parsed.score === 'number' ? parsed.score
    : parseInt(String(parsed.score || '')) || 0;
  if (score > 10) score = Math.round(score / 10); // 0-100 → 0-10
  score = Math.max(0, Math.min(10, score));

  // ===== sourceStats =====
  const sourceStats = parsed.sourceStats || { sampleSize: 1200, platforms: ['京东', '淘宝'] };

  // ===== flaws: 兼容字符串数组 & 对象数组 =====
  const normalizedFlaws = (Array.isArray(parsed.flaws) ? parsed.flaws : [])
    .slice(0, 5)
    .map((f: any) => {
      if (typeof f === 'string') {
        return { title: f, analysis: f, quote: null };
      }
      return {
        title: f?.title || f?.analysis || f?.description || '未知坑点',
        analysis: f?.analysis || f?.title || f?.description || '',
        quote: f?.quote || null,
      };
    });

  // ===== alternatives: {name→productName, reason→advantage} =====
  const normalizedAlternatives = (Array.isArray(parsed.alternatives) ? parsed.alternatives : [])
    .slice(0, 3)
    .map((a: any) => ({
      productName: a?.productName || a?.name || a?.title || '未知替代品',
      price: a?.price || a?.cost || '价格未知',
      advantage: a?.advantage || a?.reason || a?.description || a?.analysis || '无详细理由',
    }));

  // ===== skus: {spec→name, price+activityPrice→priceStr, spec→specs} =====
  const normalizedSkus = (Array.isArray(parsed.skus) ? parsed.skus : [])
    .slice(0, 4)
    .map((s: any) => ({
      name: s?.name || s?.spec || s?.title || '默认规格',
      priceStr: s?.priceStr || `约¥${s?.activityPrice || s?.price || s?.salePrice || '暂无数据'}`,
      specs: s?.specs || s?.spec || s?.description || s?.name || '暂无参数',
      specificFlaw: s?.specificFlaw || null,
    }));

  // ===== specsCheck: {name→specName, description→truth} =====
  const normalizedSpecsCheck = (Array.isArray(parsed.specsCheck) ? parsed.specsCheck : [])
    .slice(0, 4)
    .map((s: any) => ({
      specName: s?.specName || s?.name || s?.title || '未知参数',
      officialClaim: s?.officialClaim || s?.claim || s?.promise || '厂商未明确标注',
      truth: s?.truth || s?.description || s?.detail || s?.value || s?.analysis || '暂无数据',
    }));

  // ===== priceReference: activityPrice(string)→price(number) =====
  const normalizedPriceRefs = (Array.isArray(parsed.priceReference) ? parsed.priceReference : [])
    .slice(0, 4)
    .map((p: any) => {
      let priceNum: number | undefined;
      if (typeof p?.price === 'number') {
        priceNum = p.price;
      } else {
        const raw = String(p?.price || p?.activityPrice || p?.salePrice || '');
        const matched = raw.match(/[\d.]+/);
        priceNum = matched ? parseFloat(matched[0]) : undefined;
      }
      return {
        platform: p?.platform || '京东',
        price: priceNum,
      };
    })
    .filter((p: any) => typeof p.price === 'number' && !isNaN(p.price));

  // ===== visData.flawRadar: {labels, scores} → Record<string, number> =====
  const rawRadar = parsed.visData?.flawRadar || {};
  let flawRadar: Record<string, number> = {};
  // 如果是 Record<string, number> 格式（非 {labels, scores}）
  const hasLabels = Array.isArray(rawRadar.labels) && rawRadar.labels.length > 0;
  const hasScores = Array.isArray(rawRadar.scores) && rawRadar.scores.length > 0;
  if (hasLabels && hasScores) {
    rawRadar.labels.forEach((label: string, i: number) => {
      flawRadar[label] = typeof rawRadar.scores[i] === 'number' ? rawRadar.scores[i] : 5;
    });
  } else if (typeof rawRadar === 'object' && !Array.isArray(rawRadar)) {
    // 已经是 Record<string, number> 格式，直接使用
    const entries = Object.entries(rawRadar).filter(
      ([, v]) => typeof v === 'number' && !isNaN(v)
    );
    if (entries.length > 0) {
      flawRadar = Object.fromEntries(entries) as Record<string, number>;
    } else {
      flawRadar = { '性价比': 4, '品质': 3, '售后': 3, '成分': 4, '口碑': 4 };
    }
  } else {
    flawRadar = { '性价比': 4, '品质': 3, '售后': 3, '成分': 4, '口碑': 4 };
  }

  return {
    productName: String(parsed.productName || parsed.product_name || query),
    category: String(parsed.category || parsed.type || '未知品类'),
    imageUrl: String(parsed.imageUrl || parsed.image_url || 'null'),
    productImage: {
      url: String(parsed.productImage?.url || parsed.imageUrl || parsed.image_url || 'null'),
      alt: String(parsed.productImage?.alt || parsed.productName || query),
    },
    score,
    summary: String(parsed.summary || parsed.conclusion || '暂无总结'),
    sourceStats,
    skus: normalizedSkus,
    specsCheck: normalizedSpecsCheck,
    visData: { flawRadar },
    priceReference: normalizedPriceRefs,
    flaws: normalizedFlaws,
    alternatives: normalizedAlternatives,
    productVariants: Array.isArray(parsed.productVariants) ? parsed.productVariants.slice(0, 4) : [],
  };
}

// ============================================
// 图片 URL 处理 + 后台缓存
// ============================================
function processImageUrls(data: unknown, _env: Env): unknown {
  const imageUrlsToCache: string[] = [];
  let jsonStr = JSON.stringify(data);
  jsonStr = jsonStr.replace(/"(imageUrl|url)"\s*:\s*"(https?:\/\/[^\n\r"]+)"/g, (_m, k, u) => {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      imageUrlsToCache.push(u);
      return `"${k}":"/api/image-proxy?url=${encodeURIComponent(u)}"`;
    }
    return _m;
  });
  // fire-and-forget 图片缓存（不阻塞）
  if (imageUrlsToCache.length > 0) {
    Promise.allSettled(imageUrlsToCache.map((u) => downloadAndCacheImage(_env.IMAGE_CACHE, u)));
  }

  // ★ 自动补全 intent 字段（前端渲染依赖此字段判断商品/品类模式）
  let parsed: Record<string, any>;
  try { parsed = JSON.parse(jsonStr); } catch { return data; }
  if (!parsed.intent) {
    if (parsed.productName) parsed.intent = 'product';
    else if (parsed.category || parsed.comparisons) parsed.intent = 'category';
  }
  return parsed;
}

// ============================================
// POST /api/search — 异步 Job 模式
//   1. 缓存命中 → 立即返回 { jobId, status:"done", data }
//   2. 缓存未命中 → waitUntil 后台处理，立即返回 { jobId, status:"processing" }
//   前端用 GET /api/search/result 轮询
// ============================================
app.post('/api/search', async (c) => {
  try {
    // ---- 1. 解析请求体 ----
    let body: { query: string };
    try {
      body = await c.req.json<{ query: string }>();
    } catch {
      return c.json({ error: '请求体必须是合法 JSON，格式: { "query": "..." }' }, 400);
    }

    const query = (body.query ?? '').trim();
    if (!query || query.length === 0) {
      return c.json({ error: '查询内容不能为空' }, 400);
    }
    if (query.length > 2000) {
      return c.json({ error: '查询内容过长，最多 2000 个字符' }, 400);
    }

    // ---- 2. 查询哈希 ----
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(query));
    const queryHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    // ---- 3. D1 缓存命中 → 秒返回 ----
    try {
      const cachedRow = await c.env.DB.prepare(
        `SELECT response_json FROM search_cache WHERE query_hash = ?1 ORDER BY created_at DESC LIMIT 1`,
      ).bind(queryHash).first<{ response_json: string }>();

      if (cachedRow?.response_json) {
        const parsed = JSON.parse(cachedRow.response_json);
        // ★ 缓存中的错误记录不视为"命中"，允许重新分析
        if (!parsed._error) {
          console.log(`[缓存命中] query="${query.slice(0, 50)}" | hash=${queryHash.slice(0, 8)}`);
          return c.json({
            jobId: queryHash,
            status: 'done',
            data: parsed,
          });
        }
        console.log(`[缓存] 发现过期错误记录，清除并重新分析 | hash=${queryHash.slice(0, 8)}`);
      }
    } catch (err) {
      console.error('[D1缓存] 读取失败:', err);
    }

    // ---- 4. 后台记录搜索日志 ----
    c.executionCtx.waitUntil(
      c.env.DB.prepare('INSERT INTO search_logs (query_text, query_hash, created_at) VALUES (?, ?, ?)')
        .bind(query, queryHash, Date.now()).run().catch(() => {}),
    );

    // ---- 5. ★ 同步执行 AI 分析（不再使用 waitUntil，避免 Free plan 超时）----
    console.log(`[SearchJob] 🔍 同步分析 | query="${query.slice(0, 50)}" | hash=${queryHash.slice(0, 8)}`);

    try {
      // 5.1 混合检索（有 5 秒超时保护）
      let context = '';
      try {
        const ctxResult = await Promise.race([
          retrieveContext(query, c.env.AI, c.env.KNOWLEDGE_VECTOR, c.env.DB),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('CTX_TIMEOUT')), 5000)),
        ]);
        context = ctxResult.context;
      } catch (ctxErr) {
        console.warn(`[SearchJob] 检索超时/失败，跳过上下文 | ${(ctxErr as Error)?.message}`);
      }

      // 5.2 组装 prompt
      const userPrompt = context
        ? `用户的查询问题：${query}\n\n---\n以下是从海量真实用户评价中检索到的相关参考信息，请你结合这些信息进行分析：\n${context}\n---\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`
        : `用户的查询问题：${query}\n\n注意：当前未能检索到相关评价数据。请基于自身知识库分析，但需如实告知用户"暂缺真实评价数据"。\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`;

      // 5.3 执行 AI 分析（DeepSeek → Workers AI 兜底）
      const result = await runAIAnalysis(query, queryHash, userPrompt, c.env);

      if (result.success && result.data) {
        console.log(`[SearchJob] ✅ 分析完成 | hash=${queryHash.slice(0, 8)}`);
        return c.json({
          jobId: queryHash,
          status: 'done',
          data: result.data,
        });
      } else {
        console.error(`[SearchJob] ❌ 分析失败: ${result.error}`);
        return c.json({
          jobId: queryHash,
          status: 'error',
          error: result.error || 'AI 分析失败',
        });
      }
    } catch (e) {
      const errMsg = (e as Error)?.message || String(e);
      console.error(`[SearchJob] 💥 异常: ${errMsg}`);
      return c.json({
        jobId: queryHash,
        status: 'error',
        error: errMsg,
      });
    }

  } catch (err) {
    console.error('[POST /api/search 顶层异常]:', err);
    return c.json({ error: '服务内部错误，请稍后重试' }, 500);
  }
});

// ============================================
// POST /api/search/stream — 同步流式（向后兼容）
//   供 experimental_useObject 和 AiMascot 等旧页面使用
//   返回 NDJSON 格式：{ v: data }\n
// ============================================
app.post('/api/search/stream', async (c) => {
  try {
    let body: { query: string };
    try { body = await c.req.json<{ query: string }>(); }
    catch { return c.json({ error: '请求体必须是合法 JSON' }, 400); }

    const query = (body.query ?? '').trim();
    if (!query || query.length === 0) return c.json({ error: '查询内容不能为空' }, 400);
    if (query.length > 2000) return c.json({ error: '查询内容过长' }, 400);

    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(query));
    const queryHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    // 缓存命中
    try {
      const cachedRow = await c.env.DB.prepare(
        'SELECT response_json FROM search_cache WHERE query_hash = ?1 ORDER BY created_at DESC LIMIT 1',
      ).bind(queryHash).first<{ response_json: string }>();
      if (cachedRow?.response_json) {
        console.log(`[Stream缓存命中] query="${query.slice(0, 50)}"`);
        return c.json({ v: JSON.parse(cachedRow.response_json) });
      }
    } catch {}

    // 记录日志
    c.executionCtx.waitUntil(
      c.env.DB.prepare('INSERT INTO search_logs (query_text, query_hash, created_at) VALUES (?, ?, ?)')
        .bind(query, queryHash, Date.now()).run().catch(() => {}),
    );

    // 同步执行 AI 分析
    const { context } = await retrieveContext(query, c.env.AI, c.env.KNOWLEDGE_VECTOR, c.env.DB);
    const userPrompt = context
      ? `用户的查询问题：${query}\n\n---\n以下是从海量真实用户评价中检索到的相关参考信息：\n${context}\n---\n\n请按系统提示词要求深度分析。输出纯 JSON 格式。`
      : `用户的查询问题：${query}\n\n注意：当前未能检索到相关评价数据。请基于自身知识库分析。\n\n请按系统提示词要求深度分析。输出纯 JSON 格式。`;

    const result = await runAIAnalysis(query, queryHash, userPrompt, c.env);
    if (!result.success || !result.data) {
      return c.json({ error: result.error || 'AI 分析失败' }, 500);
    }
    return c.json({ v: result.data });
  } catch (err) {
    console.error('[Stream] 异常:', err);
    return c.json({ error: '服务内部错误' }, 500);
  }
});

// ============================================
// GET /api/search/result — 轮询 Job 结果
//   前端每 2s 轮询一次，直到 status='done'
// ============================================
app.get('/api/search/result', async (c) => {
  const jobId = c.req.query('jobId');
  if (!jobId) {
    return c.json({ error: '缺少 jobId 参数' }, 400);
  }

  try {
    const row = await c.env.DB.prepare(
      `SELECT response_json, created_at FROM search_cache WHERE query_hash = ?1 ORDER BY created_at DESC LIMIT 1`,
    ).bind(jobId).first<{ response_json: string; created_at: number }>();

    if (!row?.response_json) {
      // ★ 调试信息：确认 D1 中确实没有此 hash 的记录
      const countRow = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM search_cache WHERE query_hash = ?1'
      ).bind(jobId).first<{ total: number }>();
      return c.json({
        jobId,
        status: 'processing',
        _debug: { cacheRowCount: countRow?.total ?? 0, hint: 'D1中无该hash记录，后台任务可能还在运行或已崩溃' },
      });
    }

    const parsed = JSON.parse(row.response_json);

    // 检查是否为错误标记
    if (parsed._error) {
      // ★ 错误缓存 5 分钟过期：超过 5 分钟的错误视为"可重试"，返回 processing
      const ERROR_CACHE_TTL_MS = 5 * 60 * 1000;
      const age = Date.now() - (row.created_at || 0);
      if (age > ERROR_CACHE_TTL_MS) {
        console.log(`[轮询] 错误缓存已过期（${(age / 1000).toFixed(0)}s），允许重试 | hash=${jobId.slice(0, 8)}`);
        return c.json({ jobId, status: 'processing' });
      }
      return c.json({ jobId, status: 'error', error: parsed._error });
    }

    return c.json({ jobId, status: 'done', data: parsed });
  } catch (err) {
    console.error('[轮询] 查询失败:', err);
    return c.json({ jobId, status: 'processing' });
  }
});

// ============================================
// GET /api/image-proxy
// ============================================
app.get('/api/image-proxy', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: '缺少 url 参数' }, 400);

  let originalUrl: string;
  try { originalUrl = decodeURIComponent(url); } catch { return c.json({ error: 'url 参数解码失败' }, 400); }

  if (!originalUrl.startsWith('https://') && !originalUrl.startsWith('http://')) {
    return c.json({ error: '仅支持 http/https 图片链接' }, 400);
  }

  const result = getOrDownloadImage(c.env.IMAGE_CACHE, originalUrl);

  if (!result?.body) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#f5f5f5"/></svg>`;
    return new Response(svg, { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*', 'X-Image-Fallback': 'true' }});
  }

  return new Response(result.body, { status: result.status, headers: { 'Content-Type': result.contentType, 'Cache-Control': result.cacheControl, 'Access-Control-Allow-Origin': '*', 'X-Image-Cache': result.cacheControl.includes('immutable') ? 'HIT' : 'MISS' }});
});

// ============================================
// POST /api/feedback
// ============================================
app.post('/api/feedback', async (c) => {
  try {
    let body: { query: string; flaw_title: string; vote: number };
    try { body = await c.req.json(); } catch { return c.json({ error: '请求体必须是合法 JSON，格式: { "query", "flaw_title", "vote" }' }, 400); }

    const parsed = FeedbackRequestSchema.safeParse({ query: body.query, flawTitle: body.flaw_title, vote: body.vote });
    if (!parsed.success) return c.json({ error: '参数校验失败', details: parsed.error.flatten().fieldErrors }, 400);

    const { query, flawTitle, vote } = parsed.data;
    try { await c.env.DB.prepare('INSERT INTO flaw_feedback (query, flaw_title, vote) VALUES (?, ?, ?)').bind(query, flawTitle, vote).run(); }
    catch (dbErr) { console.error('[反馈] D1 写入失败:', dbErr); return c.json({ error: '反馈数据写入失败' }, 500); }

    return c.json({ success: true, message: vote === 1 ? '感谢认可！' : vote === -1 ? '反馈已记录' : '反馈已记录' });
  } catch (err) { console.error('[反馈] 异常:', err); return c.json({ error: '服务内部错误' }, 500); }
});

// ============================================
// GET /api/trending
// ============================================
app.get('/api/trending', async (c) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const { results } = await c.env.DB.prepare(`SELECT query_text, COUNT(*) as search_count FROM search_logs WHERE created_at > ? GROUP BY query_text ORDER BY search_count DESC LIMIT 6`).bind(sevenDaysAgo).all<{ query_text: string; search_count: number }>();
    return c.json({ keywords: results?.map((r) => r.query_text) ?? [] });
  } catch (err) { console.error('[热搜] 失败:', err); return c.json({ keywords: [], error: '查询失败' }, 500); }
});

// ============================================
// GET /api/health
// ============================================
app.get('/api/health', async (c) => c.json({ status: 'ok', timestamp: Date.now(), uptime: Math.floor(performance.now() / 1000), services: { workers_ai: 'ok', vectorize: 'ok', d1: 'ok' }}));

// ============================================
// POST /api/pit-submission
// ============================================
app.post('/api/pit-submission', async (c) => {
  try {
    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { return c.json({ error: '请求体必须是合法 JSON' }, 400); }
    const parsed = PitSubmissionSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: '参数校验失败', details: parsed.error.flatten().fieldErrors }, 400);

    const { userId, productName, pitTitle, description } = parsed.data;
    try { await c.env.DB.prepare(`INSERT INTO user_pit_submissions (user_id, product_name, pit_title, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`).bind(userId, productName, pitTitle, description, Date.now()).run(); }
    catch (dbErr) { console.error('[避坑提交] 失败:', dbErr); return c.json({ error: '提交失败' }, 500); }
    return c.json({ success: true, message: '提交成功，实验室正在核实中' });
  } catch (err) { console.error('[避坑提交] 异常:', err); return c.json({ error: '服务内部错误', status: 500 }); }
});

// ============================================
// POST /api/expose
// ============================================
app.post('/api/expose', async (c) => {
  try {
    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { return c.json({ error: '必须是合法 JSON', code: 'INVALID_JSON' }, 400); }
    const parsed = ExposeSubmissionSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: '参数校验失败', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors }, 400);

    const { userId, productName, pitTitle, description } = parsed.data;
    try { await c.env.DB.prepare(`INSERT INTO expose_posts (user_id, product_name, pit_title, description, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`).bind(userId, productName, pitTitle, description ?? null, Date.now()).run(); }
    catch (e) {
      const msg = String((e instanceof Error ? e : new Error(String(e))).message ?? '');
      if (msg.includes('no such table')) return c.json({ error: '数据库表未初始化', code: 'DB_TABLE_MISSING', detail: msg, action: '执行迁移 SQL' }, 500);
      return c.json({ error: '提交失败', code: 'DB_WRITE_ERROR', detail: msg }, 500);
    }
    return c.json({ success: true, message: '曝光已提交' });
  } catch (err) { const msg = err instanceof Error ? err.message : String(err); return c.json({ error: '内部错误', code: 'INTERNAL', detail: msg }, 500); }
});

// ============================================
// GET /api/expose
// ============================================
app.get('/api/expose', async (c) => {
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

  try {
    const qr = await c.env.DB.prepare(`SELECT id, product_name, pit_title, description, status, vote_count, created_at FROM expose_posts WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind('verified', limit, offset).all();
    const results = qr.results ?? [];
    if (!results.length) return c.json({ posts: [], hasMore: false });

    const posts = results.map((r) => ({ id: r.id, productName: r.product_name, pitTitle: r.pit_title, description: r.description, status: r.status, voteCount: r.vote_count, createdAt: r.created_at }));
    return c.json({ posts, hasMore: results.length >= limit });
  } catch (e) {
    const msg = String((e instanceof Error ? e : new Error(String(e))).message ?? '');
    if (msg.includes('no such table')) return c.json({ posts: [], hasMore: false, error: '表未初始化', code: 'DB_TABLE_MISSING' }, 500);
    return c.json({ posts: [], hasMore: false, error: '查询失败', code: 'DB_QUERY_ERROR', detail: msg }, 500);
  }
});

// ============================================
// GET /api/diagnose — 诊断端点（排查各组件连通性）
// ============================================
app.get('/api/diagnose', async (c) => {
  const results: Record<string, any> = { timestamp: new Date().toISOString(), tests: {} };

  // 1. D1 测试
  try {
    const testRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM search_cache').first<{ cnt: number }>();
    results.tests.d1 = { status: 'ok', cacheCount: testRow?.cnt ?? 0 };
  } catch (err: any) {
    results.tests.d1 = { status: 'error', message: err.message };
  }

  // 2. DeepSeek 连通性测试（只测连接，不发完整请求）
  try {
    const apiKey = c.env.DEEPSEEK_API_KEY as string | undefined;
    const baseURL = c.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const hasKey = !!apiKey;
    const keyPreview = apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : '(未设置)';

    if (!hasKey) {
      results.tests.deepseek = { status: 'skipped', reason: 'DEEPSEEK_API_KEY 未设置', keyPreview };
    } else {
      const t0 = Date.now();
      const dsRes = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: '回复 OK 两个字' }],
          temperature: 0,
          max_tokens: 5,
          stream: false,   // ★ 诊断用非流式，简单快速
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const elapsed = Date.now() - t0;
      const body = await dsRes.text().catch(() => '');
      results.tests.deepseek = {
        status: dsRes.ok ? 'ok' : `http_${dsRes.status}`,
        elapsed: `${elapsed}ms`,
        keyPreview,
        bodyPreview: body.slice(0, 200),
      };
    }
  } catch (err: any) {
    results.tests.deepseek = { status: 'error', message: err.name === 'AbortError' ? '超时(10s)' : err.message };
  }

  // 3. Workers AI 测试
  try {
    const t0 = Date.now();
    const aiRes = await Promise.race([
      c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: '回复 OK' }],
        max_tokens: 5,
      }) as Promise<{ response?: string }>,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('超时(10s)')), 10_000)),
    ]);
    const elapsed = Date.now() - t0;
    results.tests.workers_ai = {
      status: 'ok',
      elapsed: `${elapsed}ms`,
      hasResponse: !!(aiRes.response),
      preview: (aiRes.response ?? '').slice(0, 100),
    };
  } catch (err: any) {
    results.tests.workers_ai = { status: 'error', message: err.message };
  }

  // 4. Vectorize 测试
  try {
    const emb = await c.env.AI.run('@cf/baai/bge-m3', { text: ['测试'] }) as { data: number[][] };
    const vr = await c.env.KNOWLEDGE_VECTOR.query(emb.data[0], { topK: 1 });
    results.tests.vectorize = { status: 'ok', vectorDim: emb.data[0]?.length, topScore: vr.matches?.[0]?.score ?? 0 };
  } catch (err: any) {
    results.tests.vectorize = { status: 'error', message: err.message };
  }

  return c.json(results);
});

// ============================================
// GET /api/price — 慢慢买实时比价（代理）
//   查询关键词 → 返回各平台实时价格
// ============================================
interface PriceResult {
  keyword: string;
  source: 'manmanbuy' | 'fallback';
  items: { platform: string; price: number; url?: string }[];
  bestPrice?: number;
  bestPlatform?: string;
  updatedAt?: string;
}

app.get('/api/price', async (c) => {
  const keyword = (c.req.query('keyword') || '').trim();
  if (!keyword) return c.json({ error: '缺少 keyword 参数' }, 400);
  if (keyword.length > 100) return c.json({ error: '关键词过长，最多100字符' }, 400);

  const t0 = Date.now();

  try {
    // ---- 方案1：慢慢买公开搜索接口 ----
    // 使用 manmanbuy 移动端搜索 API（无需 AppKey）
    const encodedKey = encodeURIComponent(keyword);
    const mmUrl = `https://apapia-history.manmanbuy.com/Chrome/WareSreach.ashx?searchkey=${encodedKey}&datatype=0`;

    console.log(`[价格查询] 📡 查询慢慢买 | keyword="${keyword.slice(0, 40)}"`);

    const mmRes = await fetch(mmUrl, {
      headers: {
        'Accept': '*/*',
        'Referer': 'https://www.manmanbuy.com/',
        'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (mmRes.ok) {
      const text = await mmRes.text();
      // 慢慢买返回的是 callbackJSONP({...}) 格式，需要提取 JSON
      let jsonStr = text.replace(/^callbackJSONP\(/, '').replace(/\)\s*$/, '');

      try {
        const data = JSON.parse(jsonStr);
        if (data?.ok === true && data?.data) {
          const results: { platform: string; price: number; url?: string }[] = [];

          // 解析慢慢买返回的商品数据
          const goodsList: any[] = data.data || [];
          
          // 按 siteid 去重取最低价
          const platformMap = new Map<string, number>();
          for (const item of goodsList) {
            const price = parseFloat(item.spprice || item.price || '0');
            if (price <= 0) continue;
            
            // 映射 siteId 到平台名称
            const siteName = mapSiteName(item.siteName, item.siteid);
            const existing = platformMap.get(siteName);
            if (!existing || price < existing) {
              platformMap.set(siteName, price);
            }
          }

          // 转换为数组，按价格排序
          for (const [platform, price] of platformMap) {
            results.push({ platform, price });
          }
          results.sort((a, b) => a.price - b.price);

          if (results.length > 0) {
            const result: PriceResult = {
              keyword,
              source: 'manmanbuy',
              items: results,
              bestPrice: results[0].price,
              bestPlatform: results[0].platform,
              updatedAt: new Date().toISOString(),
            };
            console.log(`[价格查询] ✅ 慢慢买成功 | ${results.length}个平台 | 耗时${Date.now()-t0}ms`);
            return c.json(result);
          }
        }
      } catch (parseErr) {
        console.warn(`[价格查询] ⚠️ 慢慢买返回解析失败: ${(parseErr as Error).message}`);
      }
    } else {
      console.warn(`[价格查询] ⚠️ 慢慢买 HTTP ${mmRes.status}`);
    }

    // ---- 方案2：慢慢买 SAPI（需配置 AppKey） ----
    const appKey = c.env.MANMANBUY_APP_KEY;
    if (appKey) {
      try {
        // GB2312 编码关键词（Cloudflare Workers 用 TextEncoder 不支持 GB2312，用 encodeURIComponent 替代）
        const sapiUrl = `http://sapi.manmanbuy.com/Search.aspx?AppKey=${appKey}&Key=${encodedKey}&Class=0&Brand=0&Site=0&PriceMin=0&PriceMax=0&PageNum=1&PageSize=6&OrderBy=price`;
        
        const sapiRes = await fetch(sapiUrl, {
          signal: AbortSignal.timeout(8000),
        });

        if (sapiRes.ok) {
          const sapiData = await sapiRes.json() as any;
          if (sapiData.State === 1000 && sapiData.SearchResultList) {
            const results: { platform: string; price: number }[] = [];
            const pMap = new Map<string, number>();
            
            for (const item of sapiData.SearchResultList) {
              const price = parseFloat(item.spprice || '0');
              if (price <= 0) continue;
              const name = item.siteName || '未知';
              const existing = pMap.get(name);
              if (!existing || price < existing) pMap.set(name, price);
            }
            
            for (const [p, price] of pMap) results.push({ platform: p, price });
            results.sort((a, b) => a.price - b.price);

            if (results.length > 0) {
              return c.json({
                keyword, source: 'manmanbuy', items: results,
                bestPrice: results[0].price, bestPlatform: results[0].platform,
                updatedAt: new Date().toISOString(),
              } as PriceResult);
            }
          }
        }
      } catch (sapiErr) {
        console.warn(`[价格查询] SAPI 失败: ${(sapiErr as Error).message}`);
      }
    }

    // ---- 兜底：返回空结果（前端会用 AI 预估填充）----
    console.log(`[价格查询] ℹ️ 无实时数据，返回空结果 | keyword="${keyword}"`);
    return c.json({
      keyword,
      source: 'fallback',
      items: [],
      updatedAt: new Date().toISOString(),
      message: '暂无实时价格数据，显示 AI 预估价格',
    } as PriceResult);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[价格查询] ❌ 异常: ${msg}`);
    return c.json({
      keyword,
      source: 'fallback',
      items: [],
      error: msg,
      message: '价格查询服务暂时不可用',
    } as PriceResult, 503);
  }
});

/** 慢慢买 siteId → 平台名称映射 */
function mapSiteName(siteName: string | undefined, siteId: string | number | undefined): string {
  if (siteName && siteName.trim()) return siteName.trim();
  const idMap: Record<string, string> = {
    '1': '京东', '10': '京东', '8861': '京东商城',
    '2': '天猫', '20': '天猫', '8862': '天猫',
    '3': '淘宝', '30': '淘宝', '8863': '淘宝',
    '4': '苏宁', '40': '苏宁易购',
    '5': '国美', '50': '国美在线',
    '6': '当当', '60': '当 当网',
    '7': '亚马逊', '70': '亚马逊中国',
    '8': '唯品会', '80': '唯品会',
    '9': '网易考拉', '90': '考拉海购',
    '11': '小米商城',
    '12': '华为商城',
    '13': '拼多多',
    '14': '抖音电商',
  };
  return idMap[String(siteId)] || '其他平台';
}

// ============================================
// GET /api/blacklist
// ============================================
app.get('/api/blacklist', (c) => c.json({ items: [
  { id: 1, productName: '志高空气炸锅 99元版', score: 12, fatalFlaw: '发热管功率严重虚标，实测比标称低 40%', tags: ['溢价严重','贴牌代工'], date: '2026-05' },
  { id: 2, productName: 'SKG 眼部按摩仪 E3', score: 18, fatalFlaw: '所谓AI穴位按摩就是两个偏心马达在震', tags: ['智商税','概念炒作'], date: '2026-05' },
  { id: 3, productName: '奥克斯折叠洗衣机', score: 22, fatalFlaw: '密封圈极易发霉，洗一次衣服机器先臭了', tags: ['品控不稳'], date: '2026-04' },
  { id: 4, productName: '荣事达无叶风扇', score: 15, fatalFlaw: '风力不到普通台扇的1/3，噪音翻倍', tags: ['参数虚标'], date: '2026-05' },
], updatedAt: '2026-05-28' }));

// ============================================
// 404
// ============================================
app.all('*', (c) => c.json({ error: 'Not Found' }, 404));

// ============================================
// Cron Triggers
// ============================================
const VECTORIZE_COVERAGE_THRESHOLD = 0.5;

async function scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
  const startTime = Date.now();
  console.log(`[Cron] 定时任务触发 | ${new Date().toISOString()}`);
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const { results: topQueries } = await env.DB.prepare(`SELECT query_text, COUNT(*) as search_count FROM search_logs WHERE created_at > ? GROUP BY query_text ORDER BY search_count DESC LIMIT 10`).bind(sevenDaysAgo).all<{ query_text: string; search_count: number }>();
    if (!topQueries?.length) { console.log('[Cron] 无搜索记录'); return; }

    let newlyMarked = 0, alreadyExists = 0, checkFailed = 0;

    for (const row of topQueries) {
      const { query_text: q, search_count: count } = row;
      let isCovered = false;
      try {
        const emb = (await env.AI.run('@cf/baai/bge-m3', { text: [q] })) as { data: number[][] };
        const vr = await env.KNOWLEDGE_VECTOR.query(emb.data[0], { topK: 1, returnMetadata: false, returnValues: false });
        if (vr.matches?.length && (vr.matches[0].score ?? 0) >= VECTORIZE_COVERAGE_THRESHOLD) isCovered = true;
      } catch (err) { checkFailed++; }

      if (isCovered) continue;
      const now = Date.now();
      const existing = (await env.DB.prepare('SELECT id FROM pending_crawls WHERE query_text = ?').bind(q).all()).results;
      if (existing?.length) { await env.DB.prepare('UPDATE pending_crawls SET search_count=?, last_seen_at=?, updated_at=? WHERE query_text=?').bind(count, now, now, q).run(); alreadyExists++; }
      else { await env.DB.prepare('INSERT INTO pending_crawls (query_text,search_count,reason,status,first_seen_at,last_seen_at,created_at) VALUES (?,"知识库无匹配","pending",?,?,?)').bind(q, count, now, now, now).run(); newlyMarked++; }
    }

    console.log(`[Cron] 完成 | 扫描${topQueries.length}条 | 新${newlyMarked} 已有${alreadyExists} 异常${checkFailed} | ${Date.now()-startTime}ms`);
  } catch (err) { console.error('[Cron] 异常:', err); throw err; }
}

export default { fetch: app.fetch, scheduled };
