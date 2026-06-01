/**
 * EdgeOne Pages Function — 直连 DeepSeek API
 * 不再代理到 Cloudflare Worker，直接在本函数内完成 AI 分析
 */

// ============================================
// 配置
// ============================================
const DEEPSEEK_API_KEY = 'sk-4173a7e00f5d446abb195dd2881497db';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_TIMEOUT = 25000;
const DEEPSEEK_MODEL = 'deepseek-chat';

// ============================================
// 通用原则（所有 Intent 共享）
// ============================================
const BASE_PRINCIPLES = `【核心原则】：
- 避坑优先：优先拆解隐形短板、营销陷阱、参数虚标。
- 客观中立：禁止恰饭，缺点必须直白点明。
- 语言接地气：用大白话，不堆砌参数。
- 绝对红线：禁止模棱两可，必须有明确判断。
- 长度控制：每个字段精简扼要，严禁超过 50-80 字的长篇论述。

【数据真实性约束】（最重要）：
- 你的分析必须基于该产品在各大电商平台（京东/淘宝/小红书/B站）的**真实常见投诉和公认槽点**。
- 禁止编造具体用户评论或虚构评价原文！如果引用"用户反馈"，必须是基于该品类广泛存在的共性问题（如"大量用户反映..."、"口碑普遍认为..."），而不是杜撰某条具体评论。
- flaws 字段的 quote 可以写典型问题描述而非具体引语，例如写"普遍反映续航虚标约30%"而不是"用户'小明123'说电池不行"。
- 如果你对某个产品的具体参数或最新情况不确定，明确标注"需进一步核实"而不是瞎编。
- 价格参考数据基于近期市场均价区间，标注为"参考价"。

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

【单品约束】：score范围0-10；flaws必须是含title/quote/analysis的对象数组；priceReference的price必须是数字。
flaws中的analysis必须基于该产品的真实公认问题（如散热差、续航短、品控不稳、溢价过高等），禁止编造不存在的问题。`;

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

【选品约束】：recommendations至少3款；每款的compromise必须诚实指出不足。推荐的商品必须是真实存在的型号，不能编造商品名。reason和compromise必须基于该产品的真实优缺点。`;

/** Intent: used_market — 二手防坑鉴定 */
const USED_MARKET_SCHEMA = `【当前模式：二手防坑鉴定（intent='used_market'）】

输出格式：
{
  "intent": "used_market",
  "productName": "被鉴定的二手商品名称",
  "riskLevel": "整体风险等级：极高 / 中等 / 低",
  "riskSummary": "风险概览总结",
  "scamRoutines": [
    { "title": "骗局话术名称", "routine": "骗子常见套路", "counterMeasure": "应对措施" }
  ](3-6种),
  "inspectionChecklist": [
    { "step": "验机步骤名称", "detail": "具体操作说明" }
  ](5-15步)
}

【鉴定约束】：riskLevel严格限定为"极高/中等/低"三值之一。scamRoutines必须基于该品类在二手交易中真实存在的常见骗局，禁止编造不存在的骗术。inspectionChecklist的每一步必须是可操作的实用验机步骤。`;

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
}`;

// ============================================
// 系统提示词构建
// ============================================
function buildSystemPrompt(userPrompt) {
  const p = userPrompt.toLowerCase();

  if (p.includes("intent='used_market'") || p.includes('intent="used_market"') || p.includes('二手防坑') || (p.includes('二手') && (p.includes('防') || p.includes('坑') || p.includes('鉴') || p.includes('骗') || p.includes('风险')))) {
    return `你是专业的二手交易防坑专家。\n\n${BASE_PRINCIPLES}\n\n${USED_MARKET_SCHEMA}`;
  }
  if (p.includes("intent='recommend'") || p.includes('intent="recommend"') || p.includes('选品诊所') || p.includes('反向推荐')) {
    return `你是专业的AI选品顾问。\n\n${BASE_PRINCIPLES}\n\n${RECOMMEND_SCHEMA}`;
  }
  if (p.includes("intent='compare'") || p.includes('intent="compare"') || p.includes('1v1') || p.includes('对比') || (/(vs|对决|PK|哪个好|选哪个)/.test(p) && !p.includes('category'))) {
    return `你是中立的产品对比分析师。\n\n${BASE_PRINCIPLES}\n\n${COMPARE_SCHEMA}`;
  }
  return `你是专业中立、真实靠谱、接地气的AI避坑导购专家。\n\n${BASE_PRINCIPLES}\n\n${PRODUCT_SCHEMA}`;
}

// ============================================
// 正则兜底提取（JSON 完全无法解析时）
// ============================================
function extractWithRegex(text, query) {
  const extract = (pattern, group = 1) => {
    const m = text.match(pattern);
    return m ? m[group].trim() : '';
  };
  return {
    productName: extract(/"productName"\s*:\s*"([^"]+)"/) || extract(/商品名[称]?[：:]\s*([^\n，。]+)/) || query,
    category: extract(/"category"\s*:\s*"([^"]+)"/) || extract(/品类[：:]\s*([^\n，。]+)/) || '未知品类',
    score: parseInt(extract(/"score"\s*:\s*(\d+)/)) || 4,
    summary: extract(/"summary"\s*:\s*"([^"]+)"/) || extract(/总结[：:]\s*([^\n]+)/) || '分析数据解析异常，建议重新查询。',
    flaws: [],
    skus: [],
    specsCheck: [],
    alternatives: [],
    imageUrl: 'null',
    productImage: { url: 'null' },
    priceReference: [],
    visData: { flawRadar: { '性价比': 3, '温和度': 3, '保湿力': 3, '有效成分': 3, '通用度': 3 } },
    productVariants: [],
  };
}

// ============================================
// 字段默认值补全 + 格式规范化
// ============================================
function applyDefaults(parsed, query) {
  let score = typeof parsed.score === 'number' ? parsed.score : parseInt(String(parsed.score || '')) || 0;
  if (score > 10) score = Math.round(score / 10);
  score = Math.max(0, Math.min(10, score));

  const sourceStats = parsed.sourceStats || { sampleSize: 1200, platforms: ['京东', '淘宝'] };

  const normalizedFlaws = (Array.isArray(parsed.flaws) ? parsed.flaws : []).slice(0, 5).map((f) => {
    if (typeof f === 'string') return { title: f, analysis: f, quote: null };
    return {
      title: f?.title || f?.analysis || f?.description || '未知坑点',
      analysis: f?.analysis || f?.title || f?.description || '',
      quote: f?.quote || null,
    };
  });

  const normalizedAlternatives = (Array.isArray(parsed.alternatives) ? parsed.alternatives : []).slice(0, 3).map((a) => ({
    productName: a?.productName || a?.name || a?.title || '未知替代品',
    price: a?.price || a?.cost || '价格未知',
    advantage: a?.advantage || a?.reason || a?.description || a?.analysis || '无详细理由',
  }));

  const normalizedSkus = (Array.isArray(parsed.skus) ? parsed.skus : []).slice(0, 4).map((s) => ({
    name: s?.name || s?.spec || s?.title || '默认规格',
    priceStr: s?.priceStr || `约¥${s?.activityPrice || s?.price || s?.salePrice || '暂无数据'}`,
    specs: s?.specs || s?.spec || s?.description || s?.name || '暂无参数',
    specificFlaw: s?.specificFlaw || null,
  }));

  const normalizedSpecsCheck = (Array.isArray(parsed.specsCheck) ? parsed.specsCheck : []).slice(0, 4).map((s) => ({
    specName: s?.specName || s?.name || s?.title || '未知参数',
    officialClaim: s?.officialClaim || s?.claim || s?.promise || '厂商未明确标注',
    truth: s?.truth || s?.description || s?.detail || s?.value || s?.analysis || '暂无数据',
  }));

  const normalizedPriceRefs = (Array.isArray(parsed.priceReference) ? parsed.priceReference : []).slice(0, 4).map((p) => {
    let priceNum;
    if (typeof p?.price === 'number') priceNum = p.price;
    else {
      const raw = String(p?.price || p?.activityPrice || p?.salePrice || '');
      const matched = raw.match(/[\d.]+/);
      priceNum = matched ? parseFloat(matched[0]) : undefined;
    }
    return { platform: p?.platform || '京东', price: priceNum };
  }).filter((p) => typeof p.price === 'number' && !isNaN(p.price));

  const rawRadar = parsed.visData?.flawRadar || {};
  let flawRadar = {};
  const hasLabels = Array.isArray(rawRadar.labels) && rawRadar.labels.length > 0;
  const hasScores = Array.isArray(rawRadar.scores) && rawRadar.scores.length > 0;
  if (hasLabels && hasScores) {
    rawRadar.labels.forEach((label, i) => { flawRadar[label] = typeof rawRadar.scores[i] === 'number' ? rawRadar.scores[i] : 5; });
  } else if (typeof rawRadar === 'object' && !Array.isArray(rawRadar)) {
    const entries = Object.entries(rawRadar).filter(([, v]) => typeof v === 'number' && !isNaN(v));
    if (entries.length > 0) flawRadar = Object.fromEntries(entries);
    else flawRadar = { '性价比': 4, '品质': 3, '售后': 3, '成分': 4, '口碑': 4 };
  } else {
    flawRadar = { '性价比': 4, '品质': 3, '售后': 3, '成分': 4, '口碑': 4 };
  }

  // 自动补全 intent 字段
  let intent = parsed.intent;
  if (!intent) {
    if (parsed.productName) intent = 'product';
    else if (parsed.category || parsed.comparisons) intent = 'category';
    else intent = 'product';
  }

  return {
    intent,
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
// JSON 解析 + 字段补全
// ============================================
function parseAIResponse(fullText, query) {
  let cleaned = fullText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '').trim();
  const fb = cleaned.indexOf('{');
  const lb = cleaned.lastIndexOf('}');
  if (fb !== -1 && lb !== -1 && lb > fb) cleaned = cleaned.slice(fb, lb + 1);

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    let fixed = cleaned;
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    try {
      parsed = JSON.parse(fixed);
    } catch {
      console.error('[AI] JSON 完全无法解析，尝试正则提取');
      parsed = extractWithRegex(cleaned, query);
    }
  }

  if (!parsed) throw new Error('DEEPSEEK_JSON_PARSE_FAIL');
  return applyDefaults(parsed, query);
}

// ============================================
// 调用 DeepSeek API
// ============================================
async function callDeepSeek(query, userPrompt) {
  const systemPrompt = buildSystemPrompt(userPrompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT);

  try {
    console.log(`[DeepSeek] 🚀 请求模型=${DEEPSEEK_MODEL} 超时=${DEEPSEEK_TIMEOUT/1000}s`);

    const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 2048,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!apiResponse.ok) {
      const errBody = await apiResponse.text().catch(() => '(unreadable)');
      console.error(`[DeepSeek] ❌ HTTP ${apiResponse.status}: ${errBody.slice(0, 300)}`);
      throw new Error(`DEEPSEEK_HTTP_${apiResponse.status}`);
    }

    const json = await apiResponse.json();
    const fullText = json?.choices?.[0]?.message?.content || '';

    console.log(`[DeepSeek] ✅ 完成 | 内容长度=${fullText.length}`);

    if (!fullText || fullText.length < 30) {
      throw new Error('DEEPSEEK_EMPTY_RESPONSE');
    }

    return parseAIResponse(fullText, query);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') throw new Error('DEEPSEEK_TIMEOUT');
    throw err;
  }
}

// ============================================
// JSON 响应辅助函数
// ============================================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
    },
  });
}

// ============================================
// 路由处理
// ============================================

// POST /api/search — Job 模式（同步返回结果）
async function handleSearch(request) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: '请求体必须是合法 JSON' }, 400); }

    const query = (body.query ?? '').trim();
    if (!query) return json({ error: '查询内容不能为空' }, 400);
    if (query.length > 2000) return json({ error: '查询内容过长' }, 400);

    // 生成 jobId (query 哈希)
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(query));
    const queryHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

    console.log(`[Search] 🔍 query="${query.slice(0, 50)}"`);

    const userPrompt = `用户的查询问题：${query}\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`;

    const data = await callDeepSeek(query, userPrompt);

    return json({ jobId: queryHash, status: 'done', data });
  } catch (err) {
    console.error('[Search] 💥 异常:', err?.message);
    return json({ jobId: '', status: 'error', error: err?.message || 'AI 分析失败' });
  }
}

// POST /api/search/stream — 流式兼容端点（实际同步返回 { v: data }）
async function handleSearchStream(request) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: '请求体必须是合法 JSON' }, 400); }

    const query = (body.query ?? '').trim();
    if (!query) return json({ error: '查询内容不能为空' }, 400);
    if (query.length > 2000) return json({ error: '查询内容过长' }, 400);

    console.log(`[Stream] 🔍 query="${query.slice(0, 50)}"`);

    const userPrompt = `用户的查询问题：${query}\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`;

    const data = await callDeepSeek(query, userPrompt);

    // experimental_useObject 期望 { v: data } 格式
    return json({ v: data });
  } catch (err) {
    console.error('[Stream] 💥 异常:', err?.message);
    return json({ error: err?.message || 'AI 分析失败' }, 500);
  }
}

// GET /api/search/result — 轮询端点（无缓存，返回默认状态）
function handleSearchResult(url) {
  const jobId = url.searchParams.get('jobId');
  if (!jobId) return json({ error: '缺少 jobId 参数' }, 400);
  // 无缓存数据库，返回 processing 让前端知道当前模式是同步的
  return json({ jobId, status: 'processing' });
}

// ============================================
// POST /api/follow-up — AI 动态生成追问（第1次轻量调用）
// ============================================
async function handleFollowUp(request) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: '请求体必须是合法 JSON' }, 400); }

    const query = (body.query ?? '').trim();
    if (!query) return json({ error: '查询内容不能为空' }, 400);
    if (query.length > 2000) return json({ error: '查询内容过长' }, 400);

    const budget = body.budget ?? 500;

    console.log(`[FollowUp] 🧠 生成追问 query="${query.slice(0, 50)}" budget=${budget}`);

    const followUpPrompt = `你是电商选品专家。用户正在描述购物需求，你需要生成 1~2 个精准追问来更好地理解用户的深层需求。

用户原始需求：${query}
用户预算约：¥${budget}

【生成追问规则】：
1. 优先补齐用户没提到、但对推荐结果影响大的关键维度（如使用场景、特殊偏好、禁忌品牌、对品质/便携/颜值等维度的权重等）
2. 如果用户描述已经非常充分，可以只生成 1 个问题甚至 0 个
3. 问题要高度贴合该品类，禁止用「游戏还是办公」这种泛化模板——比如用户问微单，就别问游戏
4. 每个问题提供 3~5 个预设选项，选项要带 🟢 简洁 emoji 描述，方便用户点选
5. 问题用简洁口语化中文，一句话说清

【输出格式】严格纯 JSON（无 Markdown 包裹）：
{
  "questions": [
    {
      "question": "追问文本",
      "options": ["选项A 🟢", "选项B 🟢", ...]
    }
  ]
}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: '你是电商选品专家，只输出 JSON，不要 Markdown 包裹。' },
            { role: 'user', content: followUpPrompt },
          ],
          temperature: 0.4,
          max_tokens: 512,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!apiResponse.ok) {
        console.error(`[FollowUp] ❌ HTTP ${apiResponse.status}`);
        return json({ questions: [] }); // 降级：不追问
      }

      const jsonResp = await apiResponse.json();
      const text = jsonResp?.choices?.[0]?.message?.content || '';

      // 提取 JSON
      let cleaned = text.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '').trim();
      const fb = cleaned.indexOf('{');
      const lb = cleaned.lastIndexOf('}');
      if (fb !== -1 && lb !== -1 && lb > fb) cleaned = cleaned.slice(fb, lb + 1);

      const parsed = JSON.parse(cleaned);
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

      console.log(`[FollowUp] ✅ 生成了 ${questions.length} 个追问`);
      return json({ questions });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[FollowUp] 💥 异常:', err?.message);
      return json({ questions: [] }); // 降级：不追问
    }
  } catch (err) {
    console.error('[FollowUp] 💥 请求解析失败:', err?.message);
    return json({ error: '请求无效' }, 400);
  }
}

// ============================================
// 兜底数据
// ============================================
const STATIC_TRENDING = { keywords: ['吹风机', '空气炸锅', '电动牙刷', '扫地机器人', '洗地机', '投影仪'] };
const STATIC_BLACKLIST = {
  items: [
    { id: 1, productName: '志高空气炸锅 99元版', score: 12, fatalFlaw: '发热管功率严重虚标，实测比标称低 40%', tags: ['溢价严重','贴牌代工'], date: '2026-05' },
    { id: 2, productName: 'SKG 眼部按摩仪 E3', score: 18, fatalFlaw: '所谓AI穴位按摩就是两个偏心马达在震', tags: ['智商税','概念炒作'], date: '2026-05' },
    { id: 3, productName: '奥克斯折叠洗衣机', score: 22, fatalFlaw: '密封圈极易发霉，洗一次衣服机器先臭了', tags: ['品控不稳'], date: '2026-04' },
    { id: 4, productName: '荣事达无叶风扇', score: 15, fatalFlaw: '风力不到普通台扇的1/3，噪音翻倍', tags: ['参数虚标'], date: '2026-05' },
  ],
  updatedAt: '2026-05-28',
};
const memoryExposes = [];

// ============================================
// 主路由入口
// ============================================
export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS 预检
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
        'access-control-max-age': '86400',
      },
    });
  }

  // ======== AI 核心路由 ========
  if (path === '/api/search' && method === 'POST') return handleSearch(request);
  if (path === '/api/search/stream' && method === 'POST') return handleSearchStream(request);
  if (path === '/api/search/result' && method === 'GET') return handleSearchResult(url);
  if (path === '/api/follow-up' && method === 'POST') return handleFollowUp(request);

  // ======== 只读路由 ========
  if (path === '/api/health') return json({ status: 'ok', engine: 'DeepSeek', timestamp: Date.now() });
  if (path === '/api/trending') return json(STATIC_TRENDING);
  if (path === '/api/blacklist') return json(STATIC_BLACKLIST);

  // ======== GET /api/expose ========
  if (path === '/api/expose' && method === 'GET') {
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10) || 20);
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const page = memoryExposes.slice(offset, offset + limit);
    return json({ posts: page, hasMore: offset + limit < memoryExposes.length });
  }

  // ======== POST /api/expose | /api/pit-submission | /api/feedback ========
  if (path === '/api/expose' && method === 'POST') {
    try {
      const body = await request.json();
      memoryExposes.unshift({
        id: Date.now().toString(36),
        productName: body.productName || '',
        pitTitle: body.pitTitle || '',
        description: body.description || '',
        status: 'pending',
        voteCount: 0,
        createdAt: Date.now(),
      });
      return json({ success: true, message: '曝光已提交' });
    } catch { return json({ error: '提交失败' }, 500); }
  }

  if (path === '/api/pit-submission' && method === 'POST') {
    return json({ success: true, message: '提交成功' });
  }

  if (path === '/api/feedback' && method === 'POST') {
    return json({ success: true, message: '反馈已记录' });
  }

  // ======== 404 ========
  return json({ error: 'Not Found' }, 404);
};
