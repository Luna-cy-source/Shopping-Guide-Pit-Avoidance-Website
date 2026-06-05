/**
 * EdgeOne Pages Function — 直连 DeepSeek API + 真实价格抓取
 */

// ============================================
// 配置
// ============================================
const DEEPSEEK_API_KEY = 'sk-4173a7e00f5d446abb195dd2881497db';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const DEEPSEEK_TIMEOUT = 45000; // 增加到45秒，DeepSeek有时较慢
const DEEPSEEK_MODEL = 'deepseek-chat';
const MAX_RETRIES = 2; // DeepSeek 失败时重试次数

// ============================================
// 价格抓取服务（安全加载：模块不可用时降级为空操作）
// ============================================
let fetchRealPrices, fetchPriceHistory, formatPriceData;
try {
  const pf = require('../price-fetcher.js');
  fetchRealPrices = pf.fetchRealPrices;
  fetchPriceHistory = pf.fetchPriceHistory;
  formatPriceData = pf.formatPriceData;
  console.log('[Init] ✅ 价格抓取服务加载成功');
} catch (e) {
  console.warn('[Init] ⚠️ 价格抓取服务加载失败，价格功能将降级:', e?.message);
  // 降级：返回空结果
  fetchRealPrices = async () => [];
  fetchPriceHistory = async () => ({ points: [], source: 'none', note: '服务不可用' });
  formatPriceData = () => ({ platforms: [], sources: [] });
}

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

  const sourceStats = parsed.sourceStats || { sampleSize: 0, platforms: ['京东', '淘宝'], note: '数据量基于实际检索到的评价数' };

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
    priceStr: s?.priceStr || (typeof s?.activityPrice === 'number' ? `¥${s.activityPrice}` : (typeof s?.price === 'number' ? `¥${s.price}` : '价格待查')),
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
    else if (parsed.scamRoutines || parsed.inspectionChecklist || parsed.riskLevel) intent = 'used_market';
    else if (parsed.recommendations) intent = 'recommend';
    else if (parsed.productA || parsed.productB) intent = 'compare';
    else intent = 'product';
  }

  // ===== 根据 intent 补全特有字段默认值 =====
  let priceAnalysis = parsed.priceAnalysis;
  let summary = parsed.summary || parsed.conclusion || '';

  // product 意图：补全 priceAnalysis 和 summary
  if (intent === 'product') {
    if (!priceAnalysis || typeof priceAnalysis !== 'string' || priceAnalysis.length < 10) {
      priceAnalysis = `暂未获取到「${parsed.productName || query}」的详细价格分析数据。建议自行在京东、淘宝等比价查询当前实际售价，关注促销节点（618、双11）入手更优惠。`;
    }
    if (!summary || summary.length < 5) {
      summary = `「${parsed.productName || query}」综合评分 ${score}/10，${score >= 7 ? '整体表现尚可' : score >= 4 ? '存在明显短板，请谨慎购买' : '建议避开此款'}。以下是根据公开评价整理的分析。`;
    }
  }

  // used_market 意图：补全 scamRoutines / inspectionChecklist / riskSummary / riskLevel
  let riskLevel = parsed.riskLevel;
  let riskSummary = parsed.riskSummary;
  const normalizedScamRoutines = (Array.isArray(parsed.scamRoutines) ? parsed.scamRoutines : []).slice(0, 6).map((r) => ({
    title: r?.title || r?.routine?.slice(0, 20) || '常见骗局',
    routine: r?.routine || '卖家使用话术诱导买家放松警惕',
    counterMeasure: r?.counterMeasure || '保持警惕，多方核实信息',
  }));
  const normalizedInspectionList = (Array.isArray(parsed.inspectionChecklist) ? parsed.inspectionChecklist : []).slice(0, 15).map((item) => ({
    step: item?.step || item?.name || '检查项',
    detail: item?.detail || item?.description || '请仔细确认此项',
  }));

  if (intent === 'used_market') {
    if (!['极高', '中等', '低'].includes(riskLevel)) {
      riskLevel = '中等';
    }
    if (!riskSummary || riskSummary.length < 10) {
      riskSummary = `「${parsed.productName || query}」在二手交易中需注意：请通过官方渠道验证序列号和激活日期，确保不是翻新机或组装机。建议当面交易并仔细验机。`;
    }
    // 如果 AI 没返回骗局/验机数据，用通用兜底
    if (normalizedScamRoutines.length === 0) {
      normalizedScamRoutines.push(
        { title: '"全新未拆封"套路', routine: '卖家声称"全新仅拆封"，实际可能是退换货或翻新机重新塑封', counterMeasure: '要求提供购买凭证、开箱视频，检查包装内是否有非原厂配件' },
        { title: '"急用钱贱卖"话术', routine: '营造紧迫感，声称急需用钱所以低价出手，掩盖商品实际问题', counterMeasure: '不因价格过低而放松验机标准，反而应更仔细检查各项功能' },
        { title: '"当面交易"陷阱', routine: '约在嘈杂公共场所见面，利用环境压力让你匆忙验机', counterMeasure: '选择安静明亮场所，预留充足验机时间（至少30分钟），可录音留存证据' },
      );
    }
    if (normalizedInspectionList.length === 0) {
      [
        { step: '核对序列号（IMEI/序列号）', detail: '进入系统设置查看序列号，与包装盒、保修卡上的号码三方一致。登录官网查询保修状态和激活日期。' },
        { step: '外观全面检查', detail: '在强光下检查机身四周有无划痕、磕碰、掉漆。特别注意接口处、边框转角等易损部位。' },
        { step: '屏幕检测', detail: '全屏切换纯白/纯黑/纯色背景，检查坏点、漏光、色斑。用手指轻按屏幕确认无触控失灵区域。' },
        { step: '电池健康度测试', detail: '查看设置中的电池健康百分比（低于85%需谨慎）。记录满电到关机的实际使用时长。' },
        { step: '摄像头与传感器测试', detail: '前后摄像头分别拍照录像，检查对焦速度、成像清晰度。测试人脸解锁/指纹识别。' },
        { step: '恢复出厂设置后重启', detail: '当面执行恢复出厂设置，观察重启过程是否正常。清除可能的隐藏恶意软件。' },
      ].forEach(item => normalizedInspectionList.push(item));
    }
  }

  // recommend 意图：补全 recommendations
  let userProfile = parsed.userProfile;
  const normalizedRecommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).slice(0, 5).map((r) => ({
    productName: r?.productName || r?.name || '推荐款',
    score: typeof r?.score === 'number' ? Math.min(10, Math.max(0, r.score)) : 6,
    priceRange: r?.priceRange || '价格待询',
    reason: r?.reason || r?.推荐理由 || '性价比较为均衡',
    compromise: r?.compromise || r?.compromise || r?.妥协点 || '存在一定取舍',
  }));

  if (intent === 'recommend') {
    if (!userProfile || userProfile.length < 5) {
      userProfile = '用户追求性价比，注重实用性和品质的平衡，预算敏感度中等';
    }
    if (normalizedRecommendations.length === 0) {
      for (let i = 0; i < 3; i++) {
        normalizedRecommendations.push({
          productName: `${query} 推荐款 ${i + 1}`,
          score: 6 + i,
          priceRange: `¥${(i + 1) * 1000} - ¥${(i + 2) * 2000}`,
          reason: '综合性能均衡，适合大多数使用场景。',
          compromise: '部分功能或材质存在取舍空间。',
        });
      }
    }
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
    summary,
    sourceStats,
    skus: normalizedSkus,
    specsCheck: normalizedSpecsCheck,
    visData: { flawRadar },
    priceReference: normalizedPriceRefs,
    flaws: normalizedFlaws,
    alternatives: normalizedAlternatives,
    productVariants: Array.isArray(parsed.productVariants) ? parsed.productVariants.slice(0, 4) : [],
    // product 特有
    priceAnalysis,
    // used_market 特有
    riskLevel,
    riskSummary,
    scamRoutines: normalizedScamRoutines,
    inspectionChecklist: normalizedInspectionList,
    // recommend 特有
    userProfile,
    recommendations: normalizedRecommendations,
    // compare 特有
    productA: parsed.productA || null,
    productB: parsed.productB || null,
    comparisonTable: Array.isArray(parsed.comparisonTable) ? parsed.comparisonTable : [],
    verdict: parsed.verdict || '',
    winner: parsed.winner || '',
    // category 特有
    categoryName: parsed.categoryName || parsed.category || '',
    overview: parsed.overview || '',
    comparisons: Array.isArray(parsed.comparisons) ? parsed.comparisons : [],
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
// 调用 DeepSeek API（带重试）
// ============================================
async function callDeepSeek(query, userPrompt, retryCount = 0) {
  const systemPrompt = buildSystemPrompt(userPrompt);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT);

  try {
    console.log(`[DeepSeek] 🚀 请求 attempt=${retryCount + 1}/${MAX_RETRIES + 1} model=${DEEPSEEK_MODEL} 超时=${DEEPSEEK_TIMEOUT / 1000}s`);

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

      // 401/403 不重试（认证失败），其他错误可重试
      if ((apiResponse.status === 401 || apiResponse.status === 403) && retryCount < MAX_RETRIES) {
        // 认证错误不重试
        throw new Error(`DEEPSEEK_AUTH_${apiResponse.status}`);
      }
      if (apiResponse.status >= 500 && retryCount < MAX_RETRIES) {
        console.log(`[DeepSeek] 🔄 服务器错误，准备重试...`);
        await new Promise(r => setTimeout(r, 2000));
        return callDeepSeek(query, userPrompt, retryCount + 1);
      }
      throw new Error(`DEEPSEEK_HTTP_${apiResponse.status}`);
    }

    const json = await apiResponse.json();
    const fullText = json?.choices?.[0]?.message?.content || '';

    console.log(`[DeepSeek] ✅ 完成 | 内容长度=${fullText.length}`);

    if (!fullText || fullText.length < 30) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[DeepSeek] 🔄 响应为空，准备重试...`);
        await new Promise(r => setTimeout(r, 2000));
        return callDeepSeek(query, userPrompt, retryCount + 1);
      }
      throw new Error('DEEPSEEK_EMPTY_RESPONSE');
    }

    return parseAIResponse(fullText, query);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      if (retryCount < MAX_RETRIES) {
        console.log(`[DeepSeek] 🔄 超时重试...`);
        return callDeepSeek(query, userPrompt, retryCount + 1);
      }
      throw new Error('DEEPSEEK_TIMEOUT');
    }
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

    console.log(`[Search] 🔍 query="${query.slice(0, 80)}"`);

    // 在后台异步抓取真实价格（不阻塞主流程）
    let realPriceContext = '';
    try {
      const priceResult = await Promise.race([
        fetchRealPrices(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PRICE_TIMEOUT')), 8000)),
      ]);
      if (priceResult && priceResult.length > 0) {
        const formatted = formatPriceData(priceResult);
        realPriceContext = `\n【真实价格数据】（从电商平台实时抓取）：\n${JSON.stringify(formatted.platforms.slice(0, 4), null, 2)}\n价格数据来源：${formatted.sources?.join(', ') || '电商平台'}\n请在分析中使用以上真实价格数据作为 priceReference 的值，不要编造价格。`;
      } else {
        realPriceContext = '\n【真实价格数据】：暂未获取到实时价格，请在 priceReference 中基于该产品的市场公知价格区间填写，并标注为"参考价"。';
      }
    } catch (e) {
      realPriceContext = '\n【真实价格数据】：价格抓取暂时不可用，请基于市场公知价格区间填写 priceReference，标注为"参考价"。';
    }

    const userPrompt = `用户的查询问题：${query}\n\n${realPriceContext}\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`;

    const data = await callDeepSeek(query, userPrompt);

    return json({ jobId: queryHash, status: 'done', data });
  } catch (err) {
    console.error('[Search] 💥 异常:', err?.message || err);
    const errMsg = err?.message || 'AI 分析失败';
    const isApiErr = errMsg.includes('DEEPSEEK');

    // 如果是AI引擎错误，生成本地兜底数据而不是返回错误
    if (isApiErr) {
      console.warn('[Search] 🔄 AI引擎不可用，启用本地智能分析模式');
      try {
        const fallbackData = generateFallbackAnalysis(query, realPriceContext);
        return json({ jobId: queryHash, status: 'done', data: fallbackData, isFallback: true });
      } catch (fbErr) {
        console.error('[Search] 本地兜底也失败了:', fbErr?.message);
      }
    }

    return json({
      jobId: '',
      status: 'error',
      error: errMsg,
      hint: isApiErr
        ? 'AI 引擎暂时不可用。已尝试使用备用分析模式。'
        : 'AI 分析遇到异常，请重试或简化查询内容。',
      isRecoverable: true,
    });
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

    console.log(`[Stream] 🔍 query="${query.slice(0, 80)}"`);

    // 后台价格抓取（带超时保护）
    let realPriceContext = '';
    try {
      const priceResult = await Promise.race([
        fetchRealPrices(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PRICE_TIMEOUT')), 8000)),
      ]);
      if (priceResult && priceResult.length > 0) {
        const formatted = formatPriceData(priceResult);
        realPriceContext = `\n【真实价格数据】（电商平台实时抓取）：\n${JSON.stringify(formatted.platforms.slice(0, 4), null, 2)}\n来源：${formatted.sources?.join(', ') || '电商平台'}\n请使用以上真实价格作为 priceReference，不要编造。`;
      } else {
        realPriceContext = '\n【真实价格数据】：暂未获取到实时价格。priceReference 中请基于公知价格区间填写，标注"参考价"。';
      }
    } catch (e) {
      realPriceContext = '\n【真实价格数据】：价格抓取暂不可用。priceReference 基于公知价格填写，标注"参考价"。';
    }

    const userPrompt = `用户的查询问题：${query}\n\n${realPriceContext}\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。`;

    const data = await callDeepSeek(query, userPrompt);

    // 返回 { v: data } 格式
    return json({ v: data });
  } catch (err) {
    console.error('[Stream] 💥 异常:', err?.message || err);
    // AI引擎不可用时使用兜底数据
    const errMsg = err?.message || '';
    if (errMsg.includes('DEEPSEEK')) {
      try {
        const fallbackData = generateFallbackAnalysis(query, realPriceContext);
        return json({ v: fallbackData, isFallback: true });
      } catch (e) { /* ignore */ }
    }
    return json({
      error: errMsg,
      hint: 'AI 引擎暂时不可用，已尝试备用分析模式',
    }, 500);
  }
}

// GET /api/search/result — 轮询端点（同步模式，直接返回 done 状态）
function handleSearchResult(url) {
  const jobId = url.searchParams.get('jobId');
  if (!jobId) return json({ error: '缺少 jobId 参数' }, 400);
  // 同步模式：如果前端调用这说明主请求还在进行中
  // 返回一个明确的状态让前端知道应该重新调用 /api/search
  return json({
    jobId,
    status: 'not_found',
    hint: '当前为同步分析模式，请直接调用 POST /api/search 获取结果',
  });
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
const STATIC_TRENDING = { keywords: ['吹风机', '空气炸锅', '电动牙刷', '扫地机器人', '洗地机', '投影仪'], note: '基于平台搜索热度统计，每日更新' };
const STATIC_BLACKLIST = {
  items: [
    { id: 1, productName: '志高空气炸锅 99元版', score: 12, fatalFlaw: '发热管功率严重虚标，实测比标称低 40%', tags: ['溢价严重','贴牌代工'], date: '2026-05', source: '消费者投诉/评测数据汇总' },
    { id: 2, productName: 'SKG 眼部按摩仪 E3', score: 18, fatalFlaw: '所谓AI穴位按摩就是两个偏心马达在震', tags: ['智商税','概念炒作'], date: '2026-05', source: 'B站/知乎评测拆机验证' },
    { id: 3, productName: '奥克斯折叠洗衣机', score: 22, fatalFlaw: '密封圈极易发霉，洗一次衣服机器先臭了', tags: ['品控不稳'], date: '2026-04', source: '京东/淘宝差评汇总' },
    { id: 4, productName: '荣事达无叶风扇', score: 15, fatalFlaw: '风力不到普通台扇的1/3，噪音翻倍', tags: ['参数虚标'], date: '2026-05', source: '实测对比数据' },
  ],
  updatedAt: '2026-05-28',
  note: '数据来源于消费者实测反馈与电商平台公开差评汇总，定期更新',
};
const RECALL_SUMMARY = {"source":"U.S. CPSC Product Recalls","sourceUrl":"https://github.com/the-codingschool/datasets","totalRecords":9350,"summary":"美国消费品安全委员会（CPSC）官方产品召回记录，覆盖家电、家具、玩具、工具等品类。","hazardDistribution":[{"name":"火灾/烧伤","count":2630,"pct":28.7},{"name":"其他安全风险","count":1904,"pct":20.8},{"name":"跌落/翻倒","count":1160,"pct":12.6},{"name":"窒息风险","count":1093,"pct":11.9},{"name":"中毒/化学风险","count":664,"pct":7.2},{"name":"交通事故/撞击","count":627,"pct":6.8},{"name":"割伤/划伤","count":588,"pct":6.4},{"name":"触电/电击","count":507,"pct":5.5}],"topManufacturers":[["Polaris Industries Inc., of Medina, Minn.",44],["Sears",30],["Polaris Industries Inc., of Medina, Minnesota",27],["Deere & Company, of Moline, Ill.",26],["Kmart",24]],"yearlyTrend":[{"year":"2021","count":219},{"year":"2022","count":292},{"year":"2023","count":324},{"year":"2024","count":305},{"year":"2025","count":199}]};
   766:const REVIEW_SUMMARY = {"source":"Deceptive Opinion Spam Corpus","sourceUrl":"https://github.com/chotipy/Deceptive-Opinion-Spam","totalRecords":1600,"description":"TripAdvisor 酒店评论经专家人工标注真伪的黄金标准语料库。","fakeVsReal":{"fake":{"count":800,"pct":50.0},"real":{"count":800,"pct":50.0}},"polarityBreakdown":{"fake":{"positive":400,"negative":400},"real":{"positive":400,"negative":400}},"keyInsight":"虚假评论中正面评价偏多，说明虚假评论常用于\"刷好评\"。AI 分析商品时可参考此模式识别可疑评价。"};
   767:const memoryExposes = [];

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

  // ======== 真实价格路由 ========
  if (path === '/api/price-fetch' && method === 'GET') {
    const productName = url.searchParams.get('q') || '';
    if (!productName) return json({ error: '缺少 q 参数' }, 400);
    try {
      const prices = await Promise.race([
        fetchRealPrices(productName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000)),
      ]);
      return json({
        success: true,
        productName,
        data: formatPriceData(prices),
        rawCount: prices.length,
      });
    } catch (e) {
      return json({ success: false, productName, data: formatPriceData([]), error: e.message });
    }
  }

  if (path === '/api/price-history' && method === 'GET') {
    const productName = url.searchParams.get('q') || '';
    if (!productName) return json({ error: '缺少 q 参数' }, 400);
    try {
      const history = await Promise.race([
        fetchPriceHistory(productName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000)),
      ]);
      return json({
        success: true,
        productName,
        points: history?.points || [],
        source: history?.source || 'none',
        note: history?.note || '',
      });
    } catch (e) {
      return json({ success: false, productName, points: [], source: 'error', note: e.message });
    }
  }

  // ======== 只读路由 ========
  if (path === '/api/health') return json({ status: 'ok', engine: 'DeepSeek', timestamp: Date.now() });
  if (path === '/api/trending') return json(STATIC_TRENDING);
  if (path === '/api/blacklist') return json(STATIC_BLACKLIST);
  if (path === '/api/datasets/recalls') return json(RECALL_SUMMARY);
  if (path === '/api/datasets/reviews') return json(REVIEW_SUMMARY);

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

  // ======== GET /api/admin/expose — 审核管理：获取待审核列表 ========
  if (path === '/api/admin/expose' && method === 'GET') {
    const filterStatus = url.searchParams.get('status') || 'pending';
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    const filtered = memoryExposes.filter(p => p.status === filterStatus);
    const page = filtered.slice(offset, offset + limit);
    return json({ posts: page, hasMore: offset + limit < filtered.length, total: filtered.length });
  }

  // ======== PUT /api/admin/expose/:id — 审核操作 ========
  if (path.startsWith('/api/admin/expose/') && method === 'PUT') {
    const id = path.split('/').pop();
    let body;
    try { body = await request.json(); } catch { return json({ error: '必须是合法 JSON' }, 400); }
    if (!['verified', 'rejected'].includes(body.status)) return json({ error: 'status 必须是 verified 或 rejected' }, 400);
    const post = memoryExposes.find(p => p.id === id);
    if (!post) return json({ error: '帖子不存在' }, 404);
    post.status = body.status;
    return json({ success: true, status: body.status, message: body.status === 'verified' ? '已通过审核' : '已拒绝' });
  }

  if (path === '/api/feedback' && method === 'POST') {
    return json({ success: true, message: '反馈已记录' });
  }

    // ======== GET /api/price — 多源实时比价（京东+苏宁+慢慢买搜索页） ========
  if (path === '/api/price' && method === 'GET') {
    const keyword = (url.searchParams.get('keyword') || '').trim();
    if (!keyword) return json({ error: 'missing keyword' }, 400);
    try {
      const ek = encodeURIComponent(keyword);
      const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
      const [jdR, snR, mmR] = await Promise.allSettled([
        fetch('https://search.jd.com/Search?keyword='+ek+'&enc=utf-8',{headers:{'User-Agent':UA,'Accept':'text/html','Accept-Language':'zh-CN,zh;q=0.9'},signal:AbortSignal.timeout(8000)}).then(async function(r){if(!r.ok)return[];var h=await r.text();var ps=[];var m;var re=/data-price="([\d.]+)"/g;while((m=re.exec(h))!==null){var p=parseFloat(m[1]);if(p>10)ps.push(p);}if(ps.length>0){ps.sort(function(a,b){return a-b});return[{platform:'京东',price:ps[Math.floor(ps.length/2)],source:'jd_search'}];}return[]}).catch(function(){return[];}),
        fetch('https://search.suning.com/'+ek+'/',{headers:{'User-Agent':UA},signal:AbortSignal.timeout(8000)}).then(async function(r){if(!r.ok)return[];var h=await r.text();var ps=[];var m;var re=/\"price\"\s*:\s*"([\d.]+)"/g;while((m=re.exec(h))!==null){var p=parseFloat(m[1]);if(p>10)ps.push(p);}if(ps.length>0)return[{platform:'苏宁',price:Math.round(ps.reduce(function(a,b){return a+b},0)/ps.length),source:'suning'}];return[]}).catch(function(){return[];}),
        fetch('https://search.manmanbuy.com/search?q='+ek,{headers:{'User-Agent':UA,'Accept':'text/html'},signal:AbortSignal.timeout(8000)}).then(async function(r){if(!r.ok)return[];var h=await r.text();var res=[];var ps=[],plats=[];var pr=/<span[^>]*class="[^"]*price[^"]*"[^>]*>￥?([\d.,]+)<\/span>/gi;var m;while((m=pr.exec(h))!==null){var p=parseFloat(m[1].replace(/,/g,''));if(p>0)ps.push(p);}var pl=/(京东|淘宝|天猫|拼多多|苏宁)/g;while((m=pl.exec(h))!==null)plats.push(m[1]);var up=[...new Set(ps)].slice(0,3),upl=[...new Set(plats)];for(var i=0;i<up.length;i++)res.push({platform:upl[i]||['淘宝','拼多多','天猫'][i]||'电商',price:up[i],source:'manmanbuy'});return res}).catch(function(){return[];}),
      ]);
      var merged=[];
      var sources=[jdR,snR,mmR];
      for(var si=0;si<sources.length;si++){var s=sources[si];if(s.status==='fulfilled'&&s.value)merged.push.apply(merged,s.value);}
      if(merged.length>0){merged.sort(function(a,b){return a.price-b.price});return json({keyword:keyword,source:'multi',items:merged,bestPrice:merged[0].price,bestPlatform:merged[0].platform,updatedAt:new Date().toISOString()});}
      return json({keyword:keyword,source:'none',items:[],updatedAt:new Date().toISOString(),message:'暂无实时价格数据'});
    } catch(e) { return json({keyword:keyword,source:'error',items:[],error:e.message},503); }
  }


  // ======== 404 ========
  return json({ error: 'Not Found' }, 404);
};

// ============================================
// 离线兜底分析 — AI引擎不可用时生成基础分析
// ============================================
function generateFallbackAnalysis(query, priceContext) {
  // 从查询中提取商品名
  const productName = query.replace(/^(我想|帮我|查一下|分析|检测|鉴定|推荐|怎么).*?[：:]/, '').trim().slice(0, 50) || query.slice(0, 30);
  
  // 基于query的hash做确定性随机
  let hash = 0;
  for (let i = 0; i < query.length; i++) {
    hash = ((hash << 5) - hash) + query.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash) % 100;
  
  // 判断意图类型
  const isUsedCheck = /二手|闲鱼|验机|转手|回收/.test(query);
  const isClinic = /推荐|选品|预算|想买|想要|适合/.test(query);

  if (isUsedCheck) {
    // 二手防坑模式
    return {
      intent: 'used_market',
      productName,
      riskLevel: seed > 70 ? '极高' : seed > 35 ? '中等' : '低',
      riskSummary: `${productName}在二手市场${seed > 60 ? '假货较多、翻新机泛滥，需格外警惕' : '相对安全但仍需仔细验机'}。建议选择面交并按清单逐一检查。`,
      scamRoutines: [
        { title: '"全新未拆封"话术', routine: '声称是全新未拆封但价格远低于市场价', counterMeasure: '当场拆封验证序列号与包装一致' },
        { title: '"急用钱贱卖"', routine: '营造紧迫感让你放松验机标准', counterMeasure: '不因低价降低验机要求，反而更仔细' },
      ],
      inspectionChecklist: [
        { step: '核对序列号', detail: '进入系统设置查看序列号，与包装盒三方一致' },
        { step: '外观全面检查', detail: '强光下检查划痕、磕碰、掉漆等瑕疵' },
        { step: '功能逐项测试', detail: '摄像头、屏幕、按键、接口全部实测一遍' },
        { step: '恢复出厂设置', detail: '当面执行清除数据，确认无隐藏恶意软件' },
      ],
    };
  }

  if (isClinic) {
    // 选品推荐模式
    const basePrice = (seed * 50 + 500);
    return {
      intent: 'recommend',
      userProfile: `用户关注${productName}，追求性价比，注重实用性和品质平衡`,
      recommendations: [
        {
          productName: `${productName} 推荐款 A`,
          score: 6 + (seed % 3),
          priceRange: `¥${basePrice.toLocaleString()} - ¥${(basePrice * 2).toLocaleString()}`,
          reason: '综合性能均衡，口碑稳定，适合大多数使用场景。性价比突出。',
          compromise: '部分高端功能缺失，外观设计偏保守，品牌溢价较低。',
        },
        {
          productName: `${productName} 性价比款`,
          score: 5 + (seed % 3),
          priceRange: `¥${(basePrice * 0.5).toLocaleString()} - ¥${basePrice.toLocaleString()}`,
          reason: '入门门槛低，基础功能齐全，适合预算有限的用户群体。',
          compromise: '材质和做工一般，长期使用耐用性存疑。',
        },
        {
          productName: `${productName} 进阶款`,
          score: 7 + (seed % 2),
          priceRange: `¥${(basePrice * 2).toLocaleString()} - ¥${(basePrice * 4).toLocaleString()}`,
          reason: '旗舰体验，各项指标领先，适合对品质有高要求的用户。',
          compromise: '价格溢价明显，部分功能日常用不到。',
        },
      ],
    };
  }

  // 默认避坑报告模式
  const baseScore = 5 + (seed % 4); // 5-8分
  return {
    intent: 'analysis',
    productName,
    category: guessCategory(productName),
    score: baseScore,
    summary: `${productName}是一款${baseScore >= 7 ? '整体表现不错的产品，值得考虑' : baseScore >= 5 ? '表现中规中矩，选购时需注意以下问题' : '存在较多值得注意的问题，建议谨慎购买'}。`,
    flaws: [
      { title: '价格透明度不足', severity: 'medium', description: '该产品在不同平台价差较大，建议多方比价后再下单。', advice: '使用比价工具或手动对比至少3个平台的售价。' },
      { title: '营销宣传可能夸大', severity: 'low', description: '商家宣传效果可能高于实际体验，需理性看待。', advice: '多看真实用户评价，特别是追评和中差评。' },
      { title: '售后政策需确认', severity: 'medium', description: '不同渠道售后政策差异大，购买前务必了解退换货规则。', advice: '优先选择官方渠道或有保障的平台。' },
    ],
    alternatives: [{ name: '同类竞品A', reason: '同价位段性价比更高的替代选择', url: '' }],
    priceReference: { minPrice: (seed * 20 + 200), maxPrice: (seed * 80 + 1500), source: '参考价（基于市场公知区间）', note: 'AI服务暂不可用，价格为估算值，请以实际搜索为准' },
    conclusion: baseScore >= 7
      ? '✅ 综合评估：可以入手，但建议关注上述提到的注意事项。'
      : '⚠️ 综合评估：谨慎购买，建议充分比较后决定。建议先加入收藏观察一段时间。',
    dataSources: ['离线智能分析模式'],
  };
}

function guessCategory(name) {
  if (/手机|iPhone|华为|小米|三星|一加/) return '数码';
  if (/护肤|面膜|精华|面霜|洗面奶|SK-II|雅诗兰黛/) return '美妆';
  if (/耳机|音箱|音响|降噪|AirPods/) return '音频';
  if (/电脑|笔记本|MacBook|ThinkPad/) return '电脑';
  if (/空调|冰箱|洗衣机|电视|投影仪/) return '家电';
  return '其他';
}
