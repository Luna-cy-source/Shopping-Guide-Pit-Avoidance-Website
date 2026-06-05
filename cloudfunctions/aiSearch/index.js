const crypto = require('crypto');
const tcb = require('@cloudbase/node-sdk');

const app = tcb.init({ env: 'pit-avoidance-d3gx1xj3j622007d9' });
const ai = app.ai();
console.log('[init] @cloudbase/node-sdk version:', (tcb && tcb.version) || 'unknown');

/**
 * aiSearch 云函数 - 基于 CloudBase AI SDK (DeepSeek-V4-Flash)
 * 兼容 callFunction(data) 和 HTTP POST body 两种调用方式
 */
exports.main = async (event, context) => {

  // HTTP 响应头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 解析请求体（兼容三种方式：HTTP body / SDK callFunction data / invokeFunction params）
    let body = {};

    if (event.body) {
      // HTTP 方式
      try { body = JSON.parse(event.body); } catch (e) { body = {}; }
    } else if (event.data) {
      // SDK callFunction 方式
      body = typeof event.data === 'string' ? (function() { try { return JSON.parse(event.data); } catch(e) { return {}; } })() : event.data;
    } else if (event.query) {
      // invokeFunction 直接传 params 方式
      body = { query: event.query };
    } else {
      // 直接读取 event 上的字段（兜底）
      body = event;
    }

    const query = String(body.query || '').trim();
    if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: '查询内容不能为空' }) };
    if (query.length > 2000) return { statusCode: 400, headers, body: JSON.stringify({ error: '查询内容过长' }) };

    console.log('[aiSearch] 查询: "' + query.slice(0, 80) + '"');

    const systemPrompt = buildSystemPrompt(query);
    const userPrompt = '用户的查询问题：' + query + '\n\n请按系统提示词要求深度分析。输出纯 JSON 格式，不要 Markdown 包裹。';

    const result = await runAIAnalysis(systemPrompt, userPrompt);

    if (result.success && result.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jobId: hashQuery(query), status: 'done', data: result.data }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ jobId: hashQuery(query), status: 'error', error: result.error || 'AI 分析失败' }),
    };
  } catch (err) {
    console.error('[aiSearch] 异常:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: '服务内部错误' }) };
  }
};

// ============================================
// AI 分析引擎（CloudBase AI SDK + 兜底）
// ============================================
async function runAIAnalysis(systemPrompt, userPrompt) {
  // 策略1: CloudBase AI SDK (DeepSeek-V4-Flash)
  try {
    var dsResult = await callCloudBaseAI(systemPrompt, userPrompt);
    if (dsResult) return { success: true, data: dsResult };
  } catch (e) {
    console.warn('[CloudBase AI] 失败:', e.message);
  }

  // 策略2: 本地兜底数据
  console.log('[aiSearch] 使用本地兜底');
  var match = userPrompt.match(/用户的查询问题：(.+)/);
  var qName = match ? match[1].trim() : '未知商品';
  return { success: true, data: generateFallbackData(qName) };
}

// ------------------------------------------
// CloudBase AI SDK 调用 (DeepSeek-V4-Flash)
// ------------------------------------------
async function callCloudBaseAI(systemPrompt, userPrompt) {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log('[CloudBase AI] 第 ' + attempt + ' 次重试，等待 ' + delay + 'ms...');
        await sleep(delay);
      }

      console.log('[CloudBase AI] 请求 (第' + attempt + '次)...');

      // 优先尝试 hunyuan-v3 (hy3-preview)，降级到 cloudbase (deepseek-v4-flash)
      let model, modelName;
      if (attempt <= 1) {
        model = ai.createModel('hunyuan-v3');
        modelName = 'hy3-preview';
      } else {
        model = ai.createModel('cloudbase');
        modelName = 'deepseek-v4-flash';
      }

      console.log('[CloudBase AI] 使用组: ' + (attempt <= 1 ? 'hunyuan-v3' : 'cloudbase') + ', 模型: ' + modelName);

      const result = await model.generateText({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
      });

      var text = (result && result.text) ? result.text : '';
      if (!text || text.length < 30) throw new Error('EMPTY_RESPONSE');

      if (result.usage) {
        console.log('[CloudBase AI] 成功 | 长度=' + text.length + ', tokens=' + JSON.stringify(result.usage));
      }

      return parseAndNormalize(text, userPrompt);
    } catch (e) {
      lastError = e;
      console.warn('[CloudBase AI] 第' + attempt + '次失败: ' + (e.message || e));
      console.warn('[CloudBase AI] 错误详情:', JSON.stringify({
        message: e.message,
        code: e.code,
        status: e.status,
        statusCode: e.statusCode,
        requestId: e.requestId,
        name: e.name,
      }));
    }
  }

  throw lastError || new Error('ALL_RETRIES_FAILED');
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ------------------------------------------
// 本地模拟数据兜底
// ------------------------------------------
function generateFallbackData(queryName) {
  return {
    intent: 'product',
    productName: queryName || '未知商品',
    category: '消费电子',
    imageUrl: null,
    productImage: { url: null, alt: queryName || '商品' },
    score: 5.5,
    summary: '关于「' + queryName + '」的分析数据暂缺。建议稍后重试，货比三家、查看真实评价、关注售后政策。',
    sourceStats: { sampleSize: 1200, platforms: ['京东', '淘宝', '小红书'] },
    skus: [],
    specsCheck: [],
    visData: {
      flawRadar: {
        labels: ['性价比', '品质', '售后', '口碑', '参数诚实'],
        scores: [5, 5, 5, 5, 5],
      },
    },
    priceReference: [],
    flaws: [
      {
        title: '暂无深度分析数据',
        quote: null,
        analysis: '当前展示的是通用避坑提示。请稍后刷新或尝试其他商品查询。建议货比三家、核实参数、关注真实用户评价。',
      },
    ],
    alternatives: [],
    productVariants: [],
    _fallback: true,
  };
}

// ============================================
// 系统提示词
// ============================================
function buildSystemPrompt(query) {
  var p = query.toLowerCase();

  var BASE_PRINCIPLES =
    '【核心原则】：\n' +
    '- 避坑优先：优先拆解隐形短板、营销陷阱、参数虚标。\n' +
    '- 客观中立：禁止恰饭，缺点必须直白点明。\n' +
    '- 语言接地气：用大白话，不堆砌参数。\n' +
    '- 绝对红线：禁止模棱两可，必须有明确判断。\n' +
    '- 长度控制：每个字段精简扼要。\n\n' +
    '【通用约束】：\n' +
    '1. 只输出 JSON，不要任何 Markdown 代码块、不要解释文字。\n' +
    '2. 所有中文字段使用简体中文。\n' +
    '3. 如果某些信息确实未知，填合理默认值而非乱编。\n' +
    '4. 禁止在 JSON 前后输出任何其他内容。';

  var PRODUCT_SCHEMA =
    '【当前模式：单品深度分析（intent=product）】\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "product",\n' +
    '  "productName": "商品全称",\n' +
    '  "category": "所属品类",\n' +
    '  "imageUrl": "无图填null",\n' +
    '  "productImage": { "url": "同imageUrl", "alt": "商品名称" },\n' +
    '  "score": "避坑综合评分 0-10（越低越需避坑）",\n' +
    '  "summary": "一句话总结建议",\n' +
    '  "sourceStats": { "sampleSize": 1200, "platforms": ["京东","淘宝","小红书"] },\n' +
    '  "skus": [\n' +
    '    { "name": "SKU型号", "priceStr": "¥价格", "specs": "核心参数", "specificFlaw": "特有坑点" }\n' +
    '  ](2-3个),\n' +
    '  "specsCheck": [\n' +
    '    { "specName": "参数名", "officialClaim": "厂商宣称", "truth": "真实情况" }\n' +
    '  ](2-3项),\n' +
    '  "visData": { "flawRadar": { "labels": ["性价比","品质","售后","口碑"], "scores": [1-10] } },\n' +
    '  "priceReference": [\n' +
    '    { "platform": "平台名", "price": 数字 }\n' +
    '  ](2-3个),\n' +
    '  "flaws": [\n' +
    '    { "title": "坑点标题", "quote": "引用评价原文", "analysis": "深度分析" }\n' +
    '  ](3-4个),\n' +
    '  "alternatives": [\n' +
    '    { "productName": "替代品", "price": "价格", "advantage": "主要优势" }\n' +
    '  ](2个),\n' +
    '  "productVariants": [\n' +
    '    { "dimension": "维度名", "values": ["选项1","选项2"] }\n' +
    '  ](3-4个)\n' +
    '}\n\n' +
    '【约束】：score范围0-10；flaws必须是含title/quote/analysis的对象数组；priceReference的price必须是数字。';

  // 二手/验机
  if (p.indexOf('二手') >= 0 || p.indexOf('验机') >= 0) {
    return '你是专业的二手交易防坑专家。帮助买家识别骗局、规避风险。\n\n' + BASE_PRINCIPLES;
  }
  // 选品推荐
  if (p.indexOf('选品') >= 0 || p.indexOf('推荐') >= 0) {
    return '你是专业的AI选品顾问。根据用户需求推荐最匹配的商品。\n\n' + BASE_PRINCIPLES;
  }
  // 对比
  if (/vs|对战|PK|哪个好|选哪个|对比|1v1/.test(p)) {
    return '你是中立的产品对比分析师。从多维度客观对比两款商品。\n\n' + BASE_PRINCIPLES;
  }

  // 默认：单品分析
  return '你是专业中立、真实靠谱的AI避坑导购专家。核心使命是帮普通用户避开消费套路、智商税。\n\n' + BASE_PRINCIPLES + '\n\n' + PRODUCT_SCHEMA;
}

// ============================================
// JSON 解析 + 字段补全
// ============================================
function parseAndNormalize(fullText, query) {
  var cleaned = fullText.trim();

  // 清除 Markdown 代码块
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '').trim();

  // 提取 JSON 部分
  var fb = cleaned.indexOf('{');
  var lb = cleaned.lastIndexOf('}');
  if (fb !== -1 && lb !== -1 && lb > fb) {
    cleaned = cleaned.slice(fb, lb + 1);
  }

  // 解析
  var parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e1) {
    var fixed = cleaned;
    var openBraces = (fixed.match(/\{/g) || []).length;
    var closeBraces = (fixed.match(/\}/g) || []).length;
    var openBrackets = (fixed.match(/\[/g) || []).length;
    var closeBrackets = (fixed.match(/\]/g) || []).length;
    for (var i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    for (var j = 0; j < openBrackets - closeBrackets; j++) fixed += ']';
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    try {
      parsed = JSON.parse(fixed);
    } catch (e2) {
      parsed = extractWithRegex(cleaned, query);
    }
  }

  if (!parsed) throw new Error('JSON_PARSE_FAIL');

  // 智能重映射：处理模型返回的非标准格式
  parsed = remapAIOutput(parsed);

  return applyDefaults(parsed, query);
}

// ------------------------------------------
// 智能重映射：将模型的各种输出格式统一为预期的 schema
// ------------------------------------------
function remapAIOutput(parsed) {
  if (!parsed || typeof parsed !== 'object') return parsed;

  // 如果已经有预期的字段，直接返回
  if (parsed.flaws && parsed.flaws.length > 0) return parsed;

  var remapped = {};

  // productName: 从推荐型号/商品名称/产品名 提取
  remapped.productName = parsed.productName || parsed.name ||
    parsed['推荐型号'] || parsed['商品名称'] || parsed['产品名'] ||
    parsed['推荐产品'] || parsed['推荐'];

  // category
  remapped.category = parsed.category || parsed['品类'] || parsed['类别'];

  // score: 从各种评分字段提取
  var rawScore = parsed.score || parsed['评分'] || parsed['避坑评分'] || parsed['综合评分'];
  if (typeof rawScore === 'string') {
    var numMatch = rawScore.match(/(\d+(?:\.\d+)?)/);
    if (numMatch) remapped.score = parseFloat(numMatch[1]);
  } else if (typeof rawScore === 'number') {
    remapped.score = rawScore;
  }

  // summary: 从总结/一句话/是否值得买 提取
  remapped.summary = parsed.summary || parsed['总结'] || parsed['一句话'] ||
    parsed['是否值得买'] || parsed['购买建议'] || parsed['总体评价'] || '';

  // flaws: 从核心坑点/明确短板/缺点/避坑提醒 提取
  var flawSources = [];
  var flawKeys = ['flaws', '核心坑点', '明确短板', '缺点', '避坑提醒', '坑点', '劣势', '不足', '问题'];
  flawKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) {
      flawSources = flawSources.concat(val);
    } else if (typeof val === 'string' && val) {
      flawSources.push(val);
    }
  });

  if (flawSources.length > 0) {
    remapped.flaws = flawSources.map(function(f) {
      if (typeof f === 'string') return { title: f, analysis: f, quote: null };
      if (typeof f === 'object') return {
        title: f.title || f.name || f['坑点'] || '',
        analysis: f.analysis || f.description || f['分析'] || '',
        quote: f.quote || null
      };
      return { title: String(f), analysis: String(f), quote: null };
    });
  }

  // alternatives: 从替代品/推荐替代 提取
  var altSources = [];
  var altKeys = ['alternatives', '替代品', '推荐替代', '竞品', '平替'];
  altKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) altSources = altSources.concat(val);
    else if (typeof val === 'string' && val) altSources.push(val);
  });
  if (altSources.length > 0) {
    remapped.alternatives = altSources.map(function(a) {
      if (typeof a === 'string') return { productName: a, price: '', advantage: '' };
      return { productName: a.productName || a.name || '', price: a.price || '', advantage: a.advantage || '' };
    });
  }

  // 保留原始字段，让 applyDefaults 做最终补全
  // 合并 remapped 和原始的 parsed（保留 remapped 的优先级）
  var merged = {};
  var allKeys = {};
  Object.keys(parsed).forEach(function(k) { allKeys[k] = true; });
  Object.keys(remapped).forEach(function(k) { allKeys[k] = true; });
  Object.keys(allKeys).forEach(function(k) {
    merged[k] = remapped[k] !== undefined ? remapped[k] : parsed[k];
  });

  return merged;
}

function extractWithRegex(text, query) {
  function extract(pattern, group) {
    group = group || 1;
    var m = text.match(pattern);
    return m ? m[group].trim() : '';
  }
  return {
    productName: extract(/"productName"\s*:\s*"([^"]+)"/) || query,
    category: extract(/"category"\s*:\s*"([^"]+)"/) || '未知品类',
    score: parseInt(extract(/"score"\s*:\s*(\d+)/)) || 5,
    summary: extract(/"summary"\s*:\s*"([^"]+)"/) || '',
    flaws: [], skus: [], specsCheck: [], alternatives: [],
    imageUrl: null, productImage: { url: null }, priceReference: [],
    visData: { flawRadar: { labels: ['性价比', '品质', '售后', '口碑'], scores: [3, 3, 3, 3] } },
    productVariants: []
  };
}

function applyDefaults(parsed, query) {
  // 从 userPrompt 中提取原始用户查询
  var realQuery = query;
  var match = query.match(/用户的查询问题：(.+?)(?:\n\n|请按系统提示词)/);
  if (match) realQuery = match[1].trim();

  // score 归一化
  var scoreVal = typeof parsed.score === 'number' ? parsed.score : parseInt(String(parsed.score || '')) || 0;
  if (scoreVal > 10) scoreVal = Math.round(scoreVal / 10);
  scoreVal = Math.max(0, Math.min(10, scoreVal));

  var sourceStats = parsed.sourceStats || { sampleSize: 1200, platforms: ['京东', '淘宝'] };

  // flaws 规范化
  var rawFlaws = Array.isArray(parsed.flaws) ? parsed.flaws : [];
  var normalizedFlaws = rawFlaws.slice(0, 5).map(function(f) {
    if (typeof f === 'string') return { title: f, analysis: f, quote: null };
    return {
      title: f.title || f.analysis || f.description || '未知坑点',
      analysis: f.analysis || f.title || f.description || '',
      quote: f.quote || null
    };
  });

  // alternatives
  var rawAlts = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
  var normalizedAlts = rawAlts.slice(0, 3).map(function(a) {
    return {
      productName: a.productName || a.name || '替代品',
      price: a.price || '',
      advantage: a.advantage || a.reason || ''
    };
  });

  var visData = parsed.visData || {};
  if (!visData.flawRadar) {
    visData = { flawRadar: { labels: ['性价比', '品质', '售后', '口碑', '参数诚实'], scores: [5, 5, 5, 5, 5] } };
  }

  var intent = parsed.intent || 'product';
  if (!parsed.intent) {
    if (parsed.productA && parsed.productB) intent = 'compare';
    else if (parsed.recommendations) intent = 'recommend';
    else if (parsed.riskLevel) intent = 'used_market';
    else intent = 'product';
  }

  var result = {
    intent: intent,
    productName: parsed.productName || realQuery,
    category: parsed.category || '未知品类',
    imageUrl: parsed.imageUrl || null,
    productImage: parsed.productImage || { url: parsed.imageUrl || null, alt: parsed.productName || realQuery },
    score: scoreVal,
    summary: parsed.summary || '',
    sourceStats: sourceStats,
    skus: Array.isArray(parsed.skus) ? parsed.skus : [],
    specsCheck: Array.isArray(parsed.specsCheck) ? parsed.specsCheck : [],
    visData: visData,
    priceReference: Array.isArray(parsed.priceReference) ? parsed.priceReference : [],
    flaws: normalizedFlaws,
    alternatives: normalizedAlts,
    productVariants: Array.isArray(parsed.productVariants) ? parsed.productVariants : []
  };

  if (intent === 'compare') {
    result.productA = parsed.productA || null;
    result.productB = parsed.productB || null;
    result.comparisonTable = parsed.comparisonTable || [];
    result.verdict = parsed.verdict || '';
    result.winner = parsed.winner || 'tie';
  }
  if (intent === 'used_market') {
    result.riskLevel = parsed.riskLevel || '中等';
    result.riskSummary = parsed.riskSummary || '';
    result.scamRoutines = parsed.scamRoutines || [];
    result.inspectionChecklist = parsed.inspectionChecklist || [];
  }
  if (intent === 'recommend') {
    result.userProfile = parsed.userProfile || '';
    result.recommendations = parsed.recommendations || [];
  }

  return result;
}

function hashQuery(query) {
  return crypto.createHash('sha256').update(query).digest('hex');
}
