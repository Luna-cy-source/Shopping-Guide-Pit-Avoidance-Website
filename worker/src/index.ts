import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateObject } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
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
  <h1>🛡️ AI 避坑导购 Worker</h1>
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
      <div class="info-value">Llama 3.3 70B (Workers AI)</div>
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
// 核心系统提示词（步骤D）
// ============================================
const SYSTEM_PROMPT = `你是专业中立、真实靠谱、接地气的AI避坑导购专家。核心使命是帮普通用户避开消费套路、智商税。
【核心原则】：
- 避坑优先：优先拆解隐形短板、营销陷阱。
- 客观中立：禁止恰饭，缺点必须直白点明。
- 语言接地气：用大白话，不堆砌参数。
- 绝对红线：禁止模棱两可，必须有明确判断。

【输出要求 — 严格控制长度防止截断】：
1. 每个字段精简扼要，严禁冗余展开。
2. 图片：imageUrl 和 productImage.url，无图时均填"null"。
3. SKU：skus 输出 2-3 个最常见配置即可。
4. 参数透视 specsCheck：2-3 个核心虚标参数，简明对比。
5. 雷达图 visData.flawRadar：5 个维度即可。
6. 比价 priceReference：2-3 个平台活动价。
7. 坑点 flaws：3-4 条核心坑点，每条控制在 50 字内。
8. 替代品 alternatives：2 个即可。
9. productVariants：3-4 个核心 SKU 维度。
10. 禁止「因人而异」「建议根据自身需求」等空话。

【格式要求】：
输出必须是合法 JSON，不要 Markdown 代码块。`;


// ============================================
// POST /api/search — RAG 检索 + 流式输出
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

    // ---- 1.5 后台异步：记录搜索日志到 D1（供 Cron 定时分析高频未覆盖商品）----
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const hashBuffer = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(query),
          );
          const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          await c.env.DB.prepare(
            'INSERT INTO search_logs (query_text, query_hash, created_at) VALUES (?, ?, ?)',
          )
            .bind(query, hashHex, Date.now())
            .run();
        } catch (err) {
          console.error('[搜索日志] 写入失败 (非阻塞):', err);
        }
      })(),
    );

    // ---- 2. 步骤 A+B：混合检索（D1 关键词精准匹配 + Vectorize 语义检索）----
    const { context } = await retrieveContext(
      query,
      c.env.AI,
      c.env.KNOWLEDGE_VECTOR,
      c.env.DB,
    );

    // ---- 3. 步骤 C：组装用户消息（注入检索上下文）----
    const userPrompt = context
      ? `用户的查询问题：${query}

---
以下是从海量真实用户评价中检索到的相关参考信息，请你务必结合这些信息进行分析：
${context}
---

请你严格按照系统提示词的【核心原则】要求，对用户查询进行深度分析。最终输出必须是纯 JSON 格式，严格匹配我定义的 Schema，不要输出任何 Markdown 包裹（不要 \`\`\`json）。`
      : `用户的查询问题：${query}

注意：当前未能检索到相关的真实用户评价数据。请你基于自身的知识库进行分析，但必须在分析中如实告知用户"暂缺真实评价数据"这一点。

请你严格按照系统提示词的【核心原则】要求，对用户查询进行深度分析。最终输出必须是纯 JSON 格式，严格匹配我定义的 Schema，不要输出任何 Markdown 包裹（不要 \`\`\`json）。`;

    // ---- 5. 双模型：Workers AI 优先，失败 → DeepSeek 兜底 ----
    let rawText = '';
    let usedFallback = false;

    // ----------------------------------------------------------------
    // 5.1 Workers AI (Llama 3.3 70B) — 速度快，同机房
    // ----------------------------------------------------------------
    const tryWorkersAI = async (): Promise<Response> => {
      const aiResponse = await c.env.AI.run(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        {
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 8192,
          response_format: { type: 'json_object' },
        },
      ) as { response?: string };

      rawText = aiResponse.response ?? '';
      if (!rawText) throw new Error('empty_response');

      console.log('[Workers AI] 响应前800字符:', rawText.slice(0, 800));

      // 清洗 markdown / 提取 JSON
      rawText = rawText
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        rawText = rawText.slice(firstBrace, lastBrace + 1);
      }

      // JSON.parse — 失败时尝试自动修复截断
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        // 自动修复：统计括号不平衡，补全缺失的闭合括号
        let fixed = rawText;
        const openBraces = (fixed.match(/\{/g) || []).length;
        const closeBraces = (fixed.match(/\}/g) || []).length;
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
        // 如果最后一个字符是逗号或引号，可能需要额外处理
        if (fixed.endsWith(',')) fixed = fixed.slice(0, -1) + '}';
        try {
          parsed = JSON.parse(fixed);
          console.log('[Workers AI] JSON 截断已自动修复');
        } catch {
          console.error('[Workers AI] JSON 解析失败，原始文本:', rawText.slice(0, 1200));
          throw parseErr;
        }
      }

      // 图片 URL 替换（代理 + 缓存预热）
      const imageUrlsToCache: string[] = [];
      rawText = rawText.replace(
        /"(imageUrl|url)"\s*:\s*"(https?:\/\/[^\n\r"]+)"/g,
        (match, key: string, url: string) => {
          try {
            const decoded = url.replace(/\\(.)/g, '$1');
            if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
              imageUrlsToCache.push(decoded);
              return `"${key}":"/api/image-proxy?url=${encodeURIComponent(decoded)}"`;
            }
          } catch { /* noop */ }
          return match;
        },
      );

      // 重新解析替换后的 JSON，确保返回的图片 URL 是代理后的
      try {
        parsed = JSON.parse(rawText);
      } catch {
        console.warn('[Workers AI] 图片 URL 替换后 JSON 解析失败，使用原解析结果');
      }

      // 后台预热图片缓存
      c.executionCtx.waitUntil(
        (async () => {
          const uniqueUrls = [...new Set(imageUrlsToCache)];
          if (uniqueUrls.length === 0) return;
          await Promise.allSettled(
            uniqueUrls.map((url) => downloadAndCacheImage(c.env.IMAGE_CACHE, url)),
          );
        })(),
      );

      // NDJSON 流：每一行是当前的完整 JSON 对象状态
      // 格式兼容前端 ai@^4 experimental_useObject（基于 ObjectStream.fromResponse）
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify(parsed) + '\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    };

    // ----------------------------------------------------------------
    // 5.2 DeepSeek (generateObject) — 质量更好，做兜底
    // 使用 generateObject 获取完整结构化输出，再以 NDJSON 格式返回，
    // 兼容前端 ai@^4 的 experimental_useObject（基于 ObjectStream.fromResponse）
    // ----------------------------------------------------------------
    const tryDeepSeek = async (): Promise<Response> => {
      console.log('[Fallback] 切换到 DeepSeek...');

      const deepseek = createDeepSeek({
        apiKey: c.env.DEEPSEEK_API_KEY,
        baseURL: c.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      });

      // 35s 超时
      const DS_TIMEOUT = 35_000;
      const result = await Promise.race([
        generateObject({
          model: deepseek('deepseek-chat'),
          schema: LLMResponseSchema,
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.7,
          maxTokens: 4096,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('LLM_TIMEOUT')), DS_TIMEOUT),
        ),
      ]);

      const parsed = result.object;

      // 图片 URL 代理替换（在序列化后的 JSON 字符串上操作）
      const imageUrlsToCache: string[] = [];
      let rawText = JSON.stringify(parsed);
      rawText = rawText.replace(
        /"(imageUrl|url)"\s*:\s*"(https?:\/\/[^\n\r"]+)"/g,
        (match, key: string, url: string) => {
          try {
            const decoded = url.replace(/\\(.)/g, '$1');
            if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
              imageUrlsToCache.push(decoded);
              return `"${key}":"/api/image-proxy?url=${encodeURIComponent(decoded)}"`;
            }
          } catch { /* noop */ }
          return match;
        },
      );

      // 后台预热图片缓存
      c.executionCtx.waitUntil(
        (async () => {
          const uniqueUrls = [...new Set(imageUrlsToCache)];
          if (uniqueUrls.length > 0) {
            await Promise.allSettled(
              uniqueUrls.map((url) => downloadAndCacheImage(c.env.IMAGE_CACHE, url)),
            );
          }
        })(),
      );

      // NDJSON 流：每一行是当前的完整 JSON 对象状态
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(rawText + '\n'));
          controller.close();
        },
      });

      usedFallback = true;
      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    };

    try {
      return await tryWorkersAI();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[Workers AI] 失败 (${errMsg.slice(0, 100)})，切换到 DeepSeek 兜底...`);

      // Workers AI 超时 / 空响应 / JSON 解析异常 → 一律切 DeepSeek
      try {
        return await tryDeepSeek();
      } catch (dsErr) {
        const dsMsg = dsErr instanceof Error ? dsErr.message : String(dsErr);
        console.error('[DeepSeek] 兜底也失败:', dsMsg);

        if (dsMsg === 'LLM_TIMEOUT') {
          return c.json(
            { error: 'AI 分析耗时过长，请搜索更具体的商品名称后重试。', code: 'DUAL_MODEL_TIMEOUT' },
            504,
          );
        }
        if (dsMsg.includes('401') || dsMsg.includes('403')) {
          return c.json(
            { error: 'AI 服务认证失败，正在紧急修复中。', code: 'LLM_AUTH_ERROR' },
            502,
          );
        }
        return c.json(
          { error: 'AI 分析服务暂时不可用，请稍后重试。', code: 'DUAL_MODEL_FAILED' },
          500,
        );
      }
    }
  } catch (err) {
    // 顶层兜底：未预期的异常
    console.error('[顶层] 未预期的请求处理异常:', err);
    return c.json({ error: '服务内部错误，请稍后重试' }, 500);
  }
});

// ============================================
// GET /api/image-proxy — 图片代理与缓存端点
// ============================================
app.get('/api/image-proxy', async (c) => {
  const url = c.req.query('url');
  if (!url) {
    return c.json({ error: '缺少 url 参数' }, 400);
  }

  // 解码原始图片 URL
  let originalUrl: string;
  try {
    originalUrl = decodeURIComponent(url);
  } catch {
    return c.json({ error: 'url 参数解码失败' }, 400);
  }

  // 校验是否为合法 HTTP(S) URL
  if (
    !originalUrl.startsWith('https://') &&
    !originalUrl.startsWith('http://')
  ) {
    return c.json({ error: '仅支持 http/https 图片链接' }, 400);
  }

  // 调用缓存模块：R2 命中 → 直接返回，未命中 → 下载 + 缓存 + 返回
  const result = await getOrDownloadImage(c.env.IMAGE_CACHE, originalUrl);

  if (!result || !result.body) {
    // 最终兜底：返回一张 1×1 SVG 占位图，前端 onError 会触发 ProductImage 降级 UI
    // 不使用 302 重定向的原因：避免浏览器显示碎图图标
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#f5f5f5"/></svg>`;
    return new Response(fallbackSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Image-Fallback': 'true',
      },
    });
  }

  return new Response(result.body, {
    status: result.status,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': result.cacheControl,
      'Access-Control-Allow-Origin': '*',
      'X-Image-Cache': result.cacheControl.includes('immutable')
        ? 'HIT'
        : 'MISS',
    },
  });
});

// ============================================
// POST /api/feedback — 用户反馈闭环
// ============================================
app.post('/api/feedback', async (c) => {
  try {
    // 1. 解析请求体
    let body: { query: string; flaw_title: string; vote: number };
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        { error: '请求体必须是合法 JSON，格式: { "query", "flaw_title", "vote" }' },
        400
      );
    }

    // 2. Zod 校验
    const parsed = FeedbackRequestSchema.safeParse({
      query: body.query,
      flawTitle: body.flaw_title, // schema.ts 用 camelCase，接口用 snake_case
      vote: body.vote,
    });
    if (!parsed.success) {
      return c.json(
        {
          error: '参数校验失败',
          details: parsed.error.flatten().fieldErrors,
        },
        400
      );
    }

    // 3. 写入 D1
    const { query, flawTitle, vote } = parsed.data;
    try {
      await c.env.DB.prepare(
        'INSERT INTO flaw_feedback (query, flaw_title, vote) VALUES (?, ?, ?)'
      )
        .bind(query, flawTitle, vote)
        .run();
    } catch (dbErr) {
      console.error('[反馈] D1 写入失败:', dbErr);
      return c.json({ error: '反馈数据写入失败，请稍后重试' }, 500);
    }

    // 4. 返回成功
    return c.json({
      success: true,
      message: vote === 1 ? '感谢认可！' : vote === -1 ? '反馈已记录，我们会持续优化' : '反馈已记录',
    });
  } catch (err) {
    console.error('[反馈] 未预期的异常:', err);
    return c.json({ error: '服务内部错误' }, 500);
  }
});

// ============================================
// GET /api/trending — 返回近 7 天高频搜索词（供前端"热门检测"展示）
// ============================================
app.get('/api/trending', async (c) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const { results } = await c.env.DB.prepare(
      `SELECT query_text, COUNT(*) as search_count
       FROM search_logs
       WHERE created_at > ?
       GROUP BY query_text
       ORDER BY search_count DESC
       LIMIT 6`,
    )
      .bind(sevenDaysAgo)
      .all<{ query_text: string; search_count: number }>();

    if (!results || results.length === 0) {
      return c.json({ keywords: [] });
    }

    return c.json({
      keywords: results.map((r) => r.query_text),
    });
  } catch (err) {
    console.error('[热搜] 查询失败:', err);
    return c.json({ keywords: [], error: '查询热搜失败' }, 500);
  }
});

// ============================================
// GET /api/health — 健康检查
// ============================================
app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: Math.floor(performance.now() / 1000),
    services: {
      workers_ai: 'ok',
      vectorize: 'ok',
      d1: 'ok',
    },
  });
});

// ============================================
// POST /api/pit-submission — 用户提交避坑线索
// ============================================
app.post('/api/pit-submission', async (c) => {
  try {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: '请求体必须是合法 JSON' }, 400);
    }

    const parsed = PitSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: '参数校验失败', details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const { userId, productName, pitTitle, description } = parsed.data;

    try {
      await c.env.DB.prepare(
        `INSERT INTO user_pit_submissions (user_id, product_name, pit_title, description, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      )
        .bind(userId, productName, pitTitle, description, Date.now())
        .run();
    } catch (dbErr) {
      console.error('[避坑提交] D1 写入失败:', dbErr);
      return c.json({ error: '提交失败，请稍后重试' }, 500);
    }

    return c.json({
      success: true,
      message: '提交成功，实验室正在核实中',
    });
  } catch (err) {
    console.error('[避坑提交] 未预期的异常:', err);
    return c.json({ error: '服务内部错误', status: 500 });
  }
});

// ============================================
// POST /api/expose — 用户提交排雷曝光
// ============================================
app.post('/api/expose', async (c) => {
  try {
    /* ---- 第 1 层：JSON 解析 ---- */
    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: '请求体必须是合法 JSON', code: 'INVALID_JSON' }, 400);
    }

    /* ---- 第 2 层：Zod 校验 ---- */
    const parsed = ExposeSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: '参数校验失败', code: 'VALIDATION_ERROR', details: parsed.error.flatten().fieldErrors },
        400,
      );
    }

    const { userId, productName, pitTitle, description } = parsed.data;

    /* ---- 第 3 层：D1 写入（带精确错误透传） ---- */
    let dbError: Error | null = null;
    try {
      await c.env.DB.prepare(
        `INSERT INTO expose_posts (user_id, product_name, pit_title, description, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
      )
        .bind(userId, productName, pitTitle, description ?? null, Date.now())
        .run();
    } catch (e) {
      dbError = e instanceof Error ? e : new Error(String(e));
      console.error('[排雷曝光 POST] D1 写入失败:', dbError.message, dbError.cause ?? '');

      // 如果表不存在，返回明确的 actionable 错误
      const msg = String(dbError.message ?? '');
      if (msg.includes('no such table')) {
        return c.json({
          error: '数据库表未初始化，请管理员执行迁移',
          code: 'DB_TABLE_MISSING',
          detail: msg,
          action: '运行 npx wrangler d1 execute <DB> --file=./migrations/0003_expose_posts.sql',
        }, 500);
      }
    }

    if (dbError) {
      return c.json({
        error: '提交失败，请稍后重试',
        code: 'DB_WRITE_ERROR',
        detail: dbError.message,
      }, 500);
    }

    return c.json({
      success: true,
      message: '曝光已提交，审核后将在前台展示',
    });
  } catch (err) {
    /* ---- 最外层兜底 ---- */
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[排雷曝光 POST] 未预期的异常:', msg);
    return c.json({ error: '服务内部错误', code: 'INTERNAL', detail: msg }, 500);
  }
});

// ============================================
// GET /api/expose — 获取已审核通过的排雷曝光列表
// 支持 ?status=verified（默认） + ?offset=0&limit=20 分页
// ============================================
app.get('/api/expose', async (c) => {
  /* ---- 第 1 层：参数校验与安全过滤 ---- */
  const rawOffset = c.req.query('offset') || '0';
  const rawLimit = c.req.query('limit') || '20';
  const offset = Math.max(0, parseInt(rawOffset, 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(rawLimit, 10) || 20));

  // 安全限制：前台只能查看 verified 的帖子，忽略用户传入的 status
  const allowedStatus = 'verified';

  /* ---- 第 2 层：D1 查询（带精确错误透传） ---- */
  let dbError: Error | null = null;
  let results: Array<{
    id: number;
    product_name: string;
    pit_title: string;
    description: string | null;
    status: string;
    vote_count: number;
    created_at: number;
  }> = [];

  try {
    const queryResult = await c.env.DB.prepare(
      `SELECT id, product_name, pit_title, description, status, vote_count, created_at
       FROM expose_posts
       WHERE status = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(allowedStatus, limit, offset)
      .all<{
        id: number;
        product_name: string;
        pit_title: string;
        description: string | null;
        status: string;
        vote_count: number;
        created_at: number;
      }>();

    results = queryResult.results ?? [];
  } catch (e) {
    dbError = e instanceof Error ? e : new Error(String(e));
    console.error('[排雷曝光 GET] D1 查询失败:', dbError.message, dbError.cause ?? '');

    // 如果是表不存在的错误，返回 actionable 信息
    const msg = String(dbError.message ?? '');
    if (msg.includes('no such table')) {
      return c.json({
        posts: [],
        hasMore: false,
        error: '数据库表未初始化，请管理员执行迁移',
        code: 'DB_TABLE_MISSING',
        detail: msg,
        action: '运行 npx wrangler d1 execute <DB> --file=./migrations/0003_expose_posts.sql',
      }, 500);
    }

    // 其他 D1 错误
    return c.json({
      posts: [],
      hasMore: false,
      error: '数据库查询失败',
      code: 'DB_QUERY_ERROR',
      detail: dbError.message,
    }, 500);
  }

  /* ---- 第 3 层：空结果快速返回（无报错） ---- */
  if (!results || results.length === 0) {
    // ★ 如果表存在但没有数据，这是正常的空状态，返回 200
    // 如果表不存在，上面的 catch 已经处理并返回 500 + 详细信息
    try {
      return c.json({ posts: [], hasMore: false });
    } catch (jsonErr) {
      console.error('[排雷曝光 GET] JSON 序列化失败:', jsonErr);
      return c.json({ posts: [], hasMore: false, error: '数据序列化失败' }, 500);
    }
  }

  /* ---- 第 4 层：结果映射 ---- */
  let posts: Array<{
    id: number;
    productName: string;
    pitTitle: string;
    description: string | null;
    status: string;
    voteCount: number;
    createdAt: number;
  }> = [];

  try {
    posts = results.map((r) => ({
      id: r.id,
      productName: r.product_name,
      pitTitle: r.pit_title,
      description: r.description,
      status: r.status,
      voteCount: r.vote_count,
      createdAt: r.created_at,
    }));
  } catch (mapErr) {
    const msg = mapErr instanceof Error ? mapErr.message : String(mapErr);
    console.error('[排雷曝光 GET] 结果映射失败:', msg);
    return c.json({
      posts: [],
      hasMore: false,
      error: '数据格式异常',
      code: 'DATA_MAPPING_ERROR',
      detail: msg,
    }, 500);
  }

  /* ---- 第 5 层：正常返回 ---- */
  try {
    return c.json({
      posts,
      hasMore: results.length >= limit,
    });
  } catch (jsonErr) {
    const msg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
    console.error('[排雷曝光 GET] 响应序列化失败:', msg);
    return c.json({
      posts: [],
      hasMore: false,
      error: '响应序列化失败',
      code: 'JSON_SERIALIZE_ERROR',
      detail: msg,
    }, 500);
  }
});

// ============================================
// GET /api/blacklist — 智商税黑榜 Mock 数据
// ============================================
app.get('/api/blacklist', (c) => {
  const blacklist = [
    {
      id: 1,
      productName: '志高空气炸锅 99元版',
      score: 12,
      fatalFlaw: '发热管功率严重虚标，实测比标称低 40%，烤鸡翅 30 分钟还是生的',
      tags: ['溢价严重', '贴牌代工', '安全隐患'],
      date: '2026-05',
    },
    {
      id: 2,
      productName: 'SKG 眼部按摩仪 E3',
      score: 18,
      fatalFlaw: '所谓「AI 穴位按摩」本质就是两个偏心马达在震，跟 30 块钱的眼保健操仪没区别',
      tags: ['智商税', '概念炒作', '贴牌代工'],
      date: '2026-05',
    },
    {
      id: 3,
      productName: '奥克斯折叠洗衣机',
      score: 22,
      fatalFlaw: '折叠结构导致密封圈极易发霉，洗一次衣服机器自己先臭了，不如手洗',
      tags: ['品控不稳', '体验极差'],
      date: '2026-04',
    },
    {
      id: 4,
      productName: '荣事达无叶风扇',
      score: 15,
      fatalFlaw: '风力实测不到普通台扇的 1/3，噪音反而翻倍，所谓负离子就是机身上贴了个负离子字样的贴纸',
      tags: ['参数虚标', '概念炒作', '溢价严重'],
      date: '2026-05',
    },
  ];

  return c.json({ items: blacklist, updatedAt: '2026-05-28' });
});

// ============================================
// 404 兜底
// ============================================
app.all('*', (c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// ============================================
// Cron Triggers: 每天凌晨 3 点自动扫描高频未覆盖商品
// ============================================
//   流程：
//     1. 从 search_logs 中聚合近 7 天搜索次数 Top 10
//     2. 对每个查询词向量化 → 查询 Vectorize 知识库
//     3. 匹配分数 < 0.5（或无结果）→ 写入 pending_crawls 待爬取队列
//     4. 日志输出扫描结果 + 新增标记数量
// ============================================
const VECTORIZE_COVERAGE_THRESHOLD = 0.5; // 低于此分数视为"知识库未覆盖"

async function scheduled(
  _event: ScheduledEvent,
  env: Env,
  _ctx: ExecutionContext,
): Promise<void> {
  const startTime = Date.now();
  console.log(
    `[Cron] ⏰ 定时任务触发 | 时间: ${new Date().toISOString()}`,
  );

  try {
    // ---- 步骤 1：从 search_logs 聚合近 7 天 Top 10 高频查询 ----
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const { results: topQueries } = await env.DB.prepare(
      `SELECT query_text, COUNT(*) as search_count
       FROM search_logs
       WHERE created_at > ?
       GROUP BY query_text
       ORDER BY search_count DESC
       LIMIT 10`,
    )
      .bind(sevenDaysAgo)
      .all<{ query_text: string; search_count: number }>();

    if (!topQueries || topQueries.length === 0) {
      console.log('[Cron] 📭 近 7 天无搜索记录，跳过扫描');
      return;
    }

    console.log(
      `[Cron] 📊 近 7 天高频查询 Top ${topQueries.length}:`,
      topQueries.map((r) => `"${r.query_text}"(${r.search_count}次)`).join(', '),
    );

    // ---- 步骤 2 & 3：逐条检查 Vectorize 覆盖率 ----
    let newlyMarked = 0;
    let alreadyExists = 0;
    let checkFailed = 0;

    for (const row of topQueries) {
      const { query_text: queryText, search_count: count } = row;

      // 2a. 向量化查询词
      let isCovered = false;
      try {
        const embeddingResponse = (await env.AI.run(
          '@cf/baai/bge-large-zh-v1.5',
          { text: [queryText] },
        )) as { data: number[][] };

        const vector = embeddingResponse.data[0];

        // 2b. 在 Vectorize 中检索，检查是否有高相关度的已有知识
        const vectorResults = await env.KNOWLEDGE_VECTOR.query(vector, {
          topK: 1,
          returnMetadata: false,
          returnValues: false,
        });

        if (
          vectorResults.matches &&
          vectorResults.matches.length > 0 &&
          (vectorResults.matches[0].score ?? 0) >= VECTORIZE_COVERAGE_THRESHOLD
        ) {
          isCovered = true;
        }
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : String(err);
        console.error(
          `[Cron] ⚠️ Vectorize 检查异常 "${queryText}": ${reason}`,
        );
        checkFailed++;
        // 检查失败视为未覆盖，继续标记
      }

      // 2c. 已覆盖 → 跳过
      if (isCovered) {
        console.log(
          `[Cron] ✅ 已覆盖: "${queryText}" (搜索 ${count} 次)`,
        );
        continue;
      }

      // 2d. 未覆盖 → 写入 pending_crawls
      try {
        const now = Date.now();

        // 先检查是否已存在
        const { results: existing } = await env.DB.prepare(
          'SELECT id, search_count, first_seen_at FROM pending_crawls WHERE query_text = ?',
        )
          .bind(queryText)
          .all<{ id: number; search_count: number; first_seen_at: number }>();

        if (existing && existing.length > 0) {
          // 已存在 → 更新搜索次数和最近发现时间
          await env.DB.prepare(
            `UPDATE pending_crawls
             SET search_count = ?, last_seen_at = ?, updated_at = ?
             WHERE query_text = ?`,
          )
            .bind(count, now, now, queryText)
            .run();
          alreadyExists++;
          console.log(
            `[Cron] 🔄 已更新: "${queryText}" (搜索 ${count} 次)`,
          );
        } else {
          // 新发现 → 插入
          await env.DB.prepare(
            `INSERT INTO pending_crawls
             (query_text, search_count, reason, status, first_seen_at, last_seen_at, created_at)
             VALUES (?, ?, '知识库无匹配', 'pending', ?, ?, ?)`,
          )
            .bind(queryText, count, now, now, now)
            .run();
          newlyMarked++;
          console.log(
            `[Cron] 📝 新标记: "${queryText}" (搜索 ${count} 次)`,
          );
        }
      } catch (err) {
        console.error(
          `[Cron] ❌ 写入 pending_crawls 失败 "${queryText}":`,
          err,
        );
      }
    }

    // ---- 步骤 4：输出本次扫描摘要 ----
    const elapsed = Date.now() - startTime;
    console.log(
      `[Cron] ✅ 定时任务完成 | ` +
        `扫描 ${topQueries.length} 条 | ` +
        `新标记 ${newlyMarked} 条 | ` +
        `已存在 ${alreadyExists} 条 | ` +
        `检查异常 ${checkFailed} 条 | ` +
        `耗时 ${elapsed}ms`,
    );
  } catch (err) {
    console.error('[Cron] 💥 定时任务异常终止:', err);
    throw err; // 抛出异常让 Cloudflare 感知到失败，便于重试
  }
}

// ============================================
// Worker 导出：HTTP fetch + Cron scheduled
// ============================================
export default {
  fetch: app.fetch,
  scheduled,
};
