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
  var match = userPrompt.match(/用户的查询问题：(.+?)(?:\n\n|请按系统提示词)/);
  var qName = match ? match[1].trim() : '未知商品';
  // 也尝试从整个 userPrompt 中提取更完整的查询上下文
  var rawQuery = userPrompt.replace(/^用户的查询问题：/, '').replace(/\n\n请按系统提示词.*$/, '').trim();
  return { success: true, data: generateFallbackData(qName, rawQuery) };
}

// ------------------------------------------
// CloudBase AI SDK 调用 (DeepSeek-V4-Flash)
// ------------------------------------------
async function callCloudBaseAI(systemPrompt, userPrompt) {
  // 只使用 cloudbase 组 + deepseek-v4-flash（已确认可用）
  const model = ai.createModel('cloudbase');
  const modelName = 'deepseek-v4-flash';
  const maxRetries = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log('[CloudBase AI] 请求 cloudbase/' + modelName + ' (第' + attempt + '次)...');

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

      if (attempt < maxRetries) {
        // 重试前等待 3s
        console.log('[CloudBase AI] 等待 3s 后重试...');
        await sleep(3000);
      }
    }
  }

  throw lastError || new Error('ALL_RETRIES_FAILED');
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// ------------------------------------------
// 本地模拟数据兜底（根据查询意图返回对应 schema）
// ------------------------------------------
function detectIntentFromQuery(q) {
  var p = (q || '').toLowerCase();
  if (p.indexOf('二手') >= 0 || p.indexOf('验机') >= 0 || p.indexOf('防坑鉴定') >= 0 || p.indexOf('避坑') >= 0) return 'used_market';
  if (p.indexOf('黑榜') >= 0 || p.indexOf('blacklist') >= 0 || p.indexOf('智商税') >= 0) return 'blacklist';
  if (/vs|对战|PK|哪个好|选哪个|对比|1v1/.test(p)) return 'compare';
  if (p.indexOf('追问') >= 0 || p.indexOf('followup') >= 0) return 'followup';
  if (p.indexOf('选品') >= 0 || p.indexOf('推荐') >= 0 || p.indexOf('clinic') >= 0) return 'recommend';
  return 'product';
}

function generateFallbackData(queryName, rawQuery) {
  var intent = detectIntentFromQuery(rawQuery || queryName);
  
  // ---- used_market 兜底 ----
  if (intent === 'used_market') {
    var hash = (queryName || '').split('').reduce(function(acc, c) { return acc + c.charCodeAt(0); }, 0);
    var seed = (hash % 100) + 1;
    return {
      intent: 'used_market',
      productName: queryName || '未知商品',
      riskLevel: (seed % 4 === 0 ? '极高' : seed % 4 === 1 ? '高' : seed % 4 === 2 ? '中等' : '低'),
      riskSummary: '「' + queryName + '」在二手市场流通量较大，建议重点查验序列号一致性、电池健康度、屏幕显示异常等关键指标。交易时务必选择安全场所当面验机。',
      scamRoutines: [
        { title: '"全新未拆封"套路', routine: '卖家声称"全新仅拆封"，实际可能是退换货或翻新机重新塑封', counterMeasure: '要求提供购买凭证、开箱视频，检查包装内是否有非原厂配件' },
        { title: '"急用钱贱卖"话术', routine: '营造紧迫感，声称急需用钱所以低价出手，掩盖商品实际问题', counterMeasure: '不因价格过低而放松验机标准，反而应更仔细检查各项功能' },
        { title: '"当面交易"陷阱', routine: '约在嘈杂公共场所见面，利用环境压力让你匆忙验机', counterMeasure: '选择安静明亮场所，预留充足验机时间（至少30分钟），可录音留存证据' },
      ],
      inspectionChecklist: [
        { step: '核对序列号（IMEI/序列号）', detail: '进入系统设置查看序列号，与包装盒、保修卡上的号码三方一致。登录官网查询保修状态和激活日期。' },
        { step: '外观全面检查', detail: '在强光下检查机身四周有无划痕、磕碰、掉漆。特别注意接口处、边框转角等易损部位。' },
        { step: '屏幕检测', detail: '全屏切换纯白/纯黑/纯色背景，检查坏点、漏光、色斑。用手指轻按屏幕确认无触控失灵区域。' },
        { step: '电池健康度测试', detail: '查看设置中的电池健康百分比（低于85%需谨慎）。记录满电到关机的实际使用时长。' },
        { step: '摄像头与传感器测试', detail: '前后摄像头分别拍照录像，检查对焦速度、成像清晰度。测试人脸解锁/指纹识别。' },
        { step: '接口与按键测试', detail: '逐一测试充电口、耳机孔插拔是否顺滑。每个物理按键反复按压确认回弹正常。' },
        { step: '网络与通信测试', detail: '插入SIM卡测试通话质量、网络信号。连接WiFi测试网速，配对蓝牙设备。' },
        { step: '恢复出厂设置后重启', detail: '当面执行恢复出厂设置，观察重启过程是否正常。清除可能的隐藏恶意软件。' },
      ],
      _fallback: true,
    };
  }
  
  // ---- blacklist 兜底 ----
  if (intent === 'blacklist') {
    return {
      intent: 'blacklist',
      items: [
        { productName: '某网红空气炸锅（低价版）', score: 25, fatalFlaw: '虚标功率、内胆涂层劣质、温控不均存在安全隐患', tags: ['小家电', '虚假宣传'], category: '厨房电器' },
        { productName: '某品牌美容仪（家用射频）', score: 20, fatalFlaw: '能量远达不到宣称值，效果等同于抹面霜，溢价超10倍', tags: ['美妆护肤仪', '智商税'], category: '个护健康' },
        { productName: '某量子能量平衡项链', score: 15, fatalFlaw: '伪科学概念产品，无任何实证支持的所谓"能量场调节"', tags: ['保健骗局', '伪科学'], category: '保健食品' },
        { productName: '某品牌除甲醛果冻', score: 22, fatalFlaw: '除醛效率极低，一颗仅能处理小衣柜级别空间，实际使用需数百颗', tags: ['家居用品', '夸大效果'], category: '家居清洁' },
        { productName: '某网红防脱发洗发水', score: 28, fatalFlaw: '普通洗发水配方换个包装就号称生发，无任何临床数据支持', tags: ['美妆护肤', '虚假宣传'], category: '个护健康' },
      ],
      _fallback: true,
    };
  }
  
  // ---- recommend 兜底 ----
  if (intent === 'recommend') {
    return {
      intent: 'recommend',
      userProfile: '根据您的需求为您精选以下商品',
      recommendations: [
        { productName: queryName + ' - 推荐款A', score: 6.5, reason: '综合表现均衡，性价比突出，适合大多数用户的选择', compromise: '', priceRange: '价格待查', tags: ['推荐'] },
        { productName: queryName + ' - 进阶款B', score: 7.0, reason: '在核心参数上更有优势，适合对品质有较高要求的用户', compromise: '价格相对较高', priceRange: '价格待查', tags: ['高品质'] },
        { productName: queryName + ' - 性价比款C', score: 6.0, reason: '价格亲民，基础功能完善，预算有限时的务实之选', compromise: '部分高级功能缺失', priceRange: '价格待查', tags: ['实惠'] },
      ],
      _fallback: true,
    };
  }
  
  // ---- compare 兜底 ----
  if (intent === 'compare') {
    return {
      intent: 'compare',
      productA: { productName: '商品A', score: 6, priceRange: '价格待查', bestFor: '综合使用', strengths: ['参数均衡'], weaknesses: ['部分信息待补充'] },
      productB: { productName: '商品B', score: 6, priceRange: '价格待查', bestFor: '综合使用', strengths: ['功能全面'], weaknesses: ['部分信息待补充'] },
      comparisonTable: [],
      verdict: '',
      winner: 'tie',
      _fallback: true,
    };
  }
  
  // ---- followup 兜底 ----
  if (intent === 'followup') {
    return {
      intent: 'followup',
      questions: [
        { question: '你的最高预算是多少？', options: ['500以内', '500-1000', '1000-2000', '不限'] },
        { question: '你最看重商品的哪方面？', options: ['性价比', '品质', '功能', '外观'] },
      ],
      _fallback: true,
    };
  }
  
  // ---- 默认 product 兜底 ----
  return {
    intent: 'product',
    productName: queryName || '未知商品',
    category: '消费电子',
    imageUrl: null,
    productImage: { url: null, alt: queryName || '商品' },
    score: 5.5,
    summary: '关于「' + queryName + '」的分析数据暂缺。建议稍后重试，货比三家、查看真实评价、关注售后政策。',
    sourceStats: { sampleSize: 1200, platforms: ['京东', '淘宝', '小红书'] },
    skus: [], specsCheck: [],
    visData: { flawRadar: { labels: ['性价比', '品质', '售后', '口碑', '参数诚实'], scores: [5, 5, 5, 5, 5] } },
    priceReference: [],
    flaws: [{ title: '暂无深度分析数据', quote: null, analysis: '当前展示的是通用避坑提示。请稍后刷新或尝试其他商品查询。' }],
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

  var USED_MARKET_SCHEMA =
    '【当前模式：二手防坑鉴定（intent=used_market）】\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "used_market",\n' +
    '  "productName": "二手商品名称",\n' +
    '  "riskLevel": "整体风险等级（低/中等/高/极高）",\n' +
    '  "riskSummary": "2-3句话的风险总结",\n' +
    '  "scamRoutines": [\n' +
    '    { "title": "骗局类型名", "script": "骗子常用话术原文", "decode": "话术背后的真实含义", "countermeasure": "应对方法" }\n' +
    '  ](3-4个),\n' +
    '  "inspectionChecklist": [\n' +
    '    { "step": "序号", "item": "检查项目名称", "detail": "具体操作步骤", "redFlag": "异常信号/红旗警示" }\n' +
    '  ](6-8个)\n' +
    '}\n\n' +
    '【约束】：scamRoutines 必须含 title/script/decode/countermeasure；inspectionChecklist 必须含 step/item/detail/redFlag；riskLevel 只能是 低/中等/高/极高 之一。';

  var RECOMMEND_SCHEMA =
    '【当前模式：AI选品推荐（intent=recommend）】\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "recommend",\n' +
    '  "userProfile": "一句话描述用户画像和核心需求（包含预算范围、使用场景、核心诉求）",\n' +
    '  "recommendations": [\n' +
    '    { \n' +
    '      "productName": "推荐商品全称（必须是真实品牌+型号，如：安克535充电宝、索尼WH-1000XM5）",\n' +
    '      "score": "避坑评分 0-10（越低越好，7以下为推荐，7以上需谨慎，9以上慎入）",\n' +
    '      "reason": "推荐理由（必须具体！至少2句话，要提到该产品的核心优势参数/实际体验/口碑特点，禁止写\"性价比高\\\"综合表现好\\\"等空话。好的例子：\"20000mAh大容量实测可充iPhone 15约4.5次，支持65W PD快充可为笔记本应急供电，Anker品牌售后网点覆盖广\"）",\n' +
    '      "compromise": "必须诚实列出需要妥协接受的短板或已知问题（如：体积偏大不便携、无显示屏剩余电量、价格较同类高20%）",\n' +
    '      "priceRange": "真实参考价区间（如：¥159-199）",\n' +
    '      "tags": ["标签1","标签2"](从以下选或自拟：高性价比|品质款|入门首选|旗舰体验|便携|大容量|长续航|静音|高效|颜值党|实用主义)\n' +
    '    }\n' +
    '  ](3-5个，按推荐优先级排序，第一项为最推荐)\n' +
    '}\n\n' +
    '【硬性约束 - 违反任一条都将导致结果无效】：\n' +
    '- recommendations 必须包含 3-5 个商品\n' +
    '- 每个 productName 必须是 真实可购买的品牌+型号，严禁用占位符\n' +
    '- reason 字段是最核心的展示内容！必须包含：①具体参数/数据 ②实际使用场景适配 ③与竞品的差异化优势\n' +
    '- reason 禁止使用这些空话模板："综合表现均衡" "性价比突出" "核心参数有优势" "适合大多数用户" "基础功能完善"\n' +
    '- compromise 必须指出真实的已知短板或争议点，不能留空\n' +
    '- priceRange 必须给出真实市场参考价，不能填"价格待查"\n' +
    '- score 要有合理区分度（不要全是6.0-7.0），好产品给低分(5-7)，一般产品给高分(7-9)';

  var BLACKLIST_SCHEMA =
    '【当前模式：智商税黑榜（intent=blacklist）】\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "blacklist",\n' +
    '  "items": [\n' +
    '    {\n' +
    '      "productName": "真实商品全称+具体型号（如：九阳VF517空气炸锅、Ulike蓝宝石Air3脱毛仪），禁止用"某品牌""某网红"等模糊名称",\n' +
    '      "score": "避坑指数 0-100（越低越坑，越需要避坑）",\n' +
    '      "fatalFlaw": "致命槽点描述（2-3句话，直白点出核心问题）",\n' +
    '      "tags": ["标签1","标签2","标签3"],\n' +
    '      "category": "商品品类"\n' +
    '    }\n' +
    '  ](5-8个)\n' +
    '}\n\n' +
    '【硬性约束】：\n' +
    '- items 必须包含 5-8 个商品\n' +
    '- 每个 productName 必须是 真实品牌+具体型号，如"九阳VF517""Ulike Air3""极米H6Pro"，严禁使用"某品牌""某网红""某低价"等占位符\n' +
    '- 覆盖品类：小家电、美妆护肤仪、数码配件、保健食品、家居用品等\n' +
    '- score 越低表示越坑；fatalFlaw 要具体指出致命问题。';

  var FOLLOWUP_SCHEMA =
    '【当前模式：AI追问（intent=followup）】\n\n' +
    '根据用户选品需求，生成 2-3 个追问问题帮助精准推荐。\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "followup",\n' +
    '  "questions": [\n' +
    '    { "question": "问题文本", "options": ["选项A","选项B","选项C"] }\n' +
    '  ](2-3个)\n' +
    '}\n\n' +
    '【约束】：questions 数组必须包含 2-3 个问题；每个问题必须有 question 和 options(至少2个选项)；选项要简洁实用。';

  var COMPARE_SCHEMA =
    '【当前模式：1v1深度对比（intent=compare）】\n\n' +
    '输出格式：\n' +
    '{\n' +
    '  "intent": "compare",\n' +
    '  "productA": {\n' +
    '    "productName": "商品A全称",\n' +
    '    "score": "避坑综合评分 0-10（越低越需避坑）",\n' +
    '    "priceRange": "价格区间（如：¥5999-7999）",\n' +
    '    "bestFor": "最适合什么人群（1句话）",\n' +
    '    "strengths": ["优势1","优势2","优势3"],\n' +
    '    "weaknesses": ["槽点1","槽点2","槽点3"]\n' +
    '  },\n' +
    '  "productB": {\n' +
    '    "productName": "商品B全称",\n' +
    '    "score": "避坑综合评分 0-10",\n' +
    '    "priceRange": "价格区间",\n' +
    '    "bestFor": "最适合什么人群",\n' +
    '    "strengths": ["优势1","优势2","优势3"],\n' +
    '    "weaknesses": ["槽点1","槽点2","槽点3"]\n' +
    '  },\n' +
    '  "comparisonTable": [\n' +
    '    { "dimension": "对比维度名", "resultA": "商品A表现", "resultB": "商品B表现", "winner": "A或B或tie" }\n' +
    '  ](5-8个),\n' +
    '  "verdict": "综合判决结论（2-3句话）",\n' +
    '  "winner": "最终推荐 A 或 B 或 tie"\n' +
    '}\n\n' +
    '【硬性约束】：\n' +
    '- productA 和 productB 必须同时存在且完整，不能为 null\n' +
    '- 每个产品必须有 productName/score/priceRange/bestFor/strengths/weaknesses\n' +
    '- strengths 和 weaknesses 各至少 2 项\n' +
    '- comparisonTable 至少 5 个维度\n' +
    '- winner 必须是 A/B/tie 之一\n' +
    '- 即便对某款商品信息有限，也要基于已有知识尽力分析填充';

  // AI追问
  if (p.indexOf('追问') >= 0 || p.indexOf('followup') >= 0) {
    return '你是专业的选品顾问助手。根据用户需求生成精准的追问问题。\n\n' + BASE_PRINCIPLES + '\n\n' + FOLLOWUP_SCHEMA;
  }
  // 智税商黑榜
  if (p.indexOf('黑榜') >= 0 || p.indexOf('blacklist') >= 0 || p.indexOf('智商税') >= 0) {
    return '你是专业的消费避坑分析师。从各大品类中筛选出当前最值得避坑的智商税产品，直白点出致命槽点。\n\n' + BASE_PRINCIPLES + '\n\n' + BLACKLIST_SCHEMA;
  }
  // 二手/验机
  if (p.indexOf('二手') >= 0 || p.indexOf('验机') >= 0) {
    return '你是专业的二手交易防坑专家。帮助买家识别骗局、规避风险。\n\n' + BASE_PRINCIPLES + '\n\n' + USED_MARKET_SCHEMA;
  }
  // 选品推荐 / 避坑导购 / clinic
  if (p.indexOf('选品') >= 0 || p.indexOf('推荐') >= 0 || p.indexOf('避坑导购') >= 0 || p.indexOf('clinic') >= 0) {
    return '你是专业的AI选品顾问。根据用户需求推荐最匹配的商品，同时指出每个推荐的避坑要点。\n\n' + BASE_PRINCIPLES + '\n\n' + RECOMMEND_SCHEMA;
  }
  // 对比
  if (/vs|对战|PK|哪个好|选哪个|对比|1v1/.test(p)) {
    return '你是中立的产品对比分析师。从多维度客观对比两款商品，必须输出完整的产品信息。\n\n' + BASE_PRINCIPLES + '\n\n' + COMPARE_SCHEMA;
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

  // 如果已经有预期的字段（单品分析模式），直接返回（但仍然需要检查 used_market/recommend 特有字段）
  if (parsed.flaws && parsed.flaws.length > 0 && !parsed.riskLevel && !parsed.recommendations) return parsed;

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

  // scamRoutines: 从骗局/骗术/套路/话术 提取（used_market 模式）
  var scamSources = [];
  var scamKeys = ['scamRoutines', '骗局', '骗术', '套路', '话术拆解', '常见骗局', '诈骗手段'];
  scamKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) scamSources = scamSources.concat(val);
  });
  if (scamSources.length > 0) {
    remapped.scamRoutines = scamSources.map(function(s) {
      if (typeof s === 'string') return { title: s, routine: s, counterMeasure: '' };
      return {
        title: s.title || s.type || s['骗局类型'] || '',
        routine: s.script || s.routine || s['话术'] || s['常用话术'] || s['套路'] || '',
        counterMeasure: s.countermeasure || s.counterMeasure || s['应对方法'] || s['对策'] || ''
      };
    });
  }

  // inspectionChecklist: 从验机清单/检查步骤/检查项 提取（used_market 模式）
  var checklistSources = [];
  var checklistKeys = ['inspectionChecklist', '验机清单', '检查步骤', '检查项', '验机步骤', '注意事项'];
  checklistKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) checklistSources = checklistSources.concat(val);
  });
  if (checklistSources.length > 0) {
    remapped.inspectionChecklist = checklistSources.map(function(c) {
      if (typeof c === 'string') return { step: 0, item: c, detail: c, redFlag: '' };
      return {
        step: c.step || c['序号'] || 0,
        item: c.item || c.name || c['项目'] || c['检查项'] || '',
        detail: c.detail || c.detailText || c['操作步骤'] || c['具体操作'] || '',
        redFlag: c.redFlag || c['红旗警示'] || c['异常信号'] || c['注意'] || ''
      };
    });
  }

  // blacklist items: 从黑榜条目/避坑列表 提取（blacklist 模式）
  var blSources = [];
  var blKeys = ['items', '黑榜', '避坑列表', '智商税列表', '产品列表'];
  blKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) blSources = blSources.concat(val);
  });
  if (blSources.length > 0) {
    remapped.items = blSources.map(function(item) {
      if (typeof item === 'string') return { productName: item, score: 30, fatalFlaw: item, tags: [], category: '' };
      return {
        productName: item.productName || item.name || item['商品名称'] || item['产品名'] || '',
        score: typeof item.score === 'number' ? item.score : parseInt(String(item.score || 30)),
        fatalFlaw: item.fatalFlaw || item['致命槽点'] || item['缺点'] || item['问题'] || '',
        tags: Array.isArray(item.tags) ? item.tags : (item['标签'] || []),
        category: item.category || item['品类'] || ''
      };
    });
  }

  // recommendations: 从推荐列表/推荐商品 提取（recommend 模式）
  var recSources = [];
  var recKeys = ['recommendations', '推荐列表', '推荐商品', '推荐结果', '选品建议'];
  recKeys.forEach(function(k) {
    var val = parsed[k];
    if (Array.isArray(val)) recSources = recSources.concat(val);
  });
  if (recSources.length > 0) {
    remapped.recommendations = recSources.map(function(r) {
      if (typeof r === 'string') return { productName: r, score: 6, reason: r, compromise: '', priceRange: '', tags: [] };
      var scoreVal = typeof r.score === 'number' ? r.score : parseInt(String(r.score || 6));
      if (scoreVal > 10) scoreVal = Math.round(scoreVal / 10);
      return {
        productName: r.productName || r.name || r['商品名称'] || r['产品名'] || '',
        score: Math.max(0, Math.min(10, scoreVal)),
        reason: r.reason || r['推荐理由'] || r['理由'] || r.description || '',
        compromise: r.compromise || r['妥协点'] || r['短板'] || '',
        priceRange: r.priceRange || r['价格区间'] || r['价格'] || '',
        tags: Array.isArray(r.tags) ? r.tags : []
      };
    });
  }

  // compare: 产品A/B 映射（对比模式）
  function mapCompareProduct(obj, defaultName) {
    if (!obj || typeof obj !== 'object') return null;
    return {
      productName: obj.productName || obj.name || obj['商品名称'] || defaultName || '',
      score: typeof obj.score === 'number' ? obj.score : parseFloat(String(obj.score || 5)),
      priceRange: obj.priceRange || obj['价格区间'] || obj.price || '',
      bestFor: obj.bestFor || obj['适合人群'] || obj.targetUser || obj['最适合'] || '',
      strengths: Array.isArray(obj.strengths) ? obj.strengths : (Array.isArray(obj.advantages) ? obj.advantages : Array.isArray(obj.优势) ? obj.优势 : []),
      weaknesses: Array.isArray(obj.weaknesses) ? obj.weaknesses : (Array.isArray(obj.disadvantages) ? obj.disadvantages : Array.isArray(obj.劣势) ? obj.劣势 : [])
    };
  }
  if (parsed.productA || parsed['产品A'] || parsed['商品A']) {
    remapped.productA = mapCompareProduct(parsed.productA || parsed['产品A'] || parsed['商品A'], '商品A');
  }
  if (parsed.productB || parsed['产品B'] || parsed['商品B']) {
    remapped.productB = mapCompareProduct(parsed.productB || parsed['产品B'] || parsed['商品B'], '商品B');
  }
  // comparisonTable 映射
  var ctSources = parsed.comparisonTable || parsed['对比表格'] || parsed['对比表'] || parsed.table;
  if (Array.isArray(ctSources) && ctSources.length > 0) {
    remapped.comparisonTable = ctSources.map(function(row) {
      if (typeof row === 'string') return { dimension: row, resultA: '', resultB: '', winner: 'tie' };
      return {
        dimension: row.dimension || row['维度'] || row.item || row.name || '',
        resultA: row.resultA || row['A'] || row.result_a || '',
        resultB: row.resultB || row['B'] || row.result_b || '',
        winner: row.winner || (row.resultA >= row.resultB ? 'A' : 'B')
      };
    });
  } else if (remapped.productA && remapped.productB) {
    // 自动生成对比表
    remapped.comparisonTable = [
      { dimension: '性价比', resultA: remapped.productA.score <= 7 ? '较高' : '一般', resultB: remapped.productB.score <= 7 ? '较高' : '一般', winner: remapped.productA.score < remapped.productB.score ? 'A' : (remapped.productB.score < remapped.productA.score ? 'B' : 'tie') },
      { dimension: '核心性能', resultA: '见分析', resultB: '见分析', winner: 'tie' },
      { dimension: '做工品质', resultA: '见分析', resultB: '见分析', winner: 'tie' },
      { dimension: '功能丰富度', resultA: '见分析', resultB: '见分析', winner: 'tie' },
      { dimension: '售后口碑', resultA: '良好', resultB: '良好', winner: 'tie' },
    ];
  }
  if (!remapped.verdict) {
    remapped.verdict = parsed.verdict || parsed['判决'] || parsed['结论'] || parsed.conclusion || '';
  }
  if (!remapped.winner) {
    remapped.winner = parsed.winner || parsed['推荐'] || parsed['胜出'] || 'tie';
  }

  // questions: 追问模式映射

  // questions: 追问模式映射
  var qSources = parsed.questions || parsed['问题列表'] || parsed['追问问题'];
  if (Array.isArray(qSources) && qSources.length > 0) {
    remapped.questions = qSources.map(function(q) {
      if (typeof q === 'string') return { question: q, options: ['是', '否'] };
      return {
        question: q.question || q['问题'] || q.text || '',
        options: Array.isArray(q.options) ? q.options : (Array.isArray(q['选项']) ? q['选项'] : ['选项A', '选项B'])
      };
    });
  }

  // 保留原始字段，让 applyDefaults 做最终补全
  // 补充 used_market 模式的风险字段映射
  if (!remapped.riskLevel) {
    remapped.riskLevel = parsed.riskLevel || parsed['风险等级'] || parsed['整体风险'];
  }
  if (!remapped.riskSummary) {
    remapped.riskSummary = parsed.riskSummary || parsed['风险总结'] || parsed['风险概述'];
  }
  // 补充 recommend 模式用户画像映射
  if (!remapped.userProfile) {
    remapped.userProfile = parsed.userProfile || parsed['用户画像'] || parsed['用户需求分析'];
  }
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

// ------------------------------------------
// Compare 模式辅助：从查询中智能提取商品名
// ------------------------------------------
function extractCompareName(query, side) {
  var defaultName = side === 'A' ? '商品A' : '商品B';
  if (!query) return defaultName;

  // 策略1: "A vs B" / "A 对 B" / "A PK B"
  var vsMatch = query.match(/(.+?)\s*(?:vs|VS|对|pk|PK|对战)\s*(.+)/);
  if (vsMatch) {
    return side === 'A' ? vsMatch[1].trim() : vsMatch[2].trim();
  }

  // 策略2: "商品 A：「xxx」"/ "商品A: xxx"
  var sidePattern = new RegExp('商品\\s*' + side + '[「:\\s]*([^」\n]+)', 'i');
  var sideMatch = query.match(sidePattern);
  if (sideMatch) {
    return cleanProductName(sideMatch[1].trim());
  }

  // 策略3: "选手 A: xxx"
  var playerPattern = new RegExp('选手\\s*' + side + '[：:\\s]*([^\\n]+)', 'i');
  var playerMatch = query.match(playerPattern);
  if (playerMatch) {
    return cleanProductName(playerMatch[1].trim());
  }

  return defaultName;
}

// ------------------------------------------
// Compare 模式辅助：清洗和校验 productName
// ------------------------------------------
function cleanProductName(name) {
  if (!name || typeof name !== 'string') return '';
  name = name.trim()
    .replace(/^["'|【『(（\s]+/, '')   // 去掉开头标点
    .replace(/["'|】』)）\s]+$/, '');   // 去掉结尾标点
  // 如果超过 40 字，截断到合理长度
  if (name.length > 40) {
    var cutPoint = name.indexOf(' ', 30);
    name = cutPoint > 0 ? name.slice(0, cutPoint) : name.slice(0, 40);
  }
  return name;
}

// productName 合理性检测：如果包含这些关键词，说明是 prompt 泄漏
function isPromptLeak(name) {
  if (!name || typeof name !== 'string') return true;
  var leakKeywords = ['深度对比', '请对下面', '全方位', '模式】', '模式]', '1v1', '对比分析', '要求', '使用 intent'];
  var lower = name.toLowerCase();
  for (var i = 0; i < leakKeywords.length; i++) {
    if (name.indexOf(leakKeywords[i]) >= 0) return true;
  }
  // 超过 50 字几乎肯定是泄漏
  if (name.length > 50) return true;
  return false;
}

// 清洗 compare product 对象的 productName
function sanitizeCompareProduct(product, query, side) {
  if (!product || typeof product !== 'object') return null;
  var result = {};
  for (var k in product) { result[k] = product[k]; }

  // 校验并修复 productName
  if (isPromptLeak(result.productName)) {
    result.productName = extractCompareName(query, side);
  } else {
    result.productName = cleanProductName(result.productName);
  }

  // 确保 score 是数字且在合理范围
  if (typeof result.score !== 'number' || isNaN(result.score)) {
    result.score = 6;
  } else {
    result.score = Math.max(0, Math.min(10, result.score));
  }

  // 确保 strengths/weaknesses 是数组
  if (!Array.isArray(result.strengths)) result.strengths = [];
  if (!Array.isArray(result.weaknesses)) result.weaknesses = [];

  return result;
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
    else if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) intent = 'followup';
    else if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) intent = 'blacklist';
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
    // 兜底：如果 AI 没返回 productA/productB，从查询中提取商品名并生成基础数据
    if (!parsed.productA || !parsed.productB) {
      var nameA = extractCompareName(realQuery, 'A');
      var nameB = extractCompareName(realQuery, 'B');
      result.productA = parsed.productA || {
        productName: nameA, score: 6, priceRange: '价格待查', bestFor: '综合使用',
        strengths: ['参数均衡', '市场口碑稳定'], weaknesses: ['部分信息待补充']
      };
      result.productB = parsed.productB || {
        productName: nameB, score: 6, priceRange: '价格待查', bestFor: '综合使用',
        strengths: ['功能覆盖全面'], weaknesses: ['部分信息待补充']
      };
    } else {
      // AI 返回了 productA/B，但需要校验 productName 合理性
      result.productA = sanitizeCompareProduct(parsed.productA, realQuery, 'A');
      result.productB = sanitizeCompareProduct(parsed.productB, realQuery, 'B');
    }
    result.comparisonTable = parsed.comparisonTable || result.comparisonTable || [];
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
    
    // 富化 recommendations：为缺失字段填充智能生成的具体内容
    var rawRecs = parsed.recommendations || [];
    if (Array.isArray(rawRecs) && rawRecs.length > 0) {
      result.recommendations = rawRecs.slice(0, 5).map(function(r, idx) {
        var recName = r.productName || r.name || ('推荐商品' + (idx + 1));
        var recScore = typeof r.score === 'number' ? r.score : parseInt(String(r.score || 6));
        if (recScore > 10) recScore = Math.round(recScore / 10);
        recScore = Math.max(0, Math.min(10, recScore));
        
        var rawReason = r.reason || r['推荐理由'] || r.description || '';
        // 检测是否是空话/模板理由，如果是则用智能生成替换
        var isGenericReason = !rawReason ||
          /综合表现均衡|性价比突出|核心参数更有优势|适合大多数用户|价格亲民|基础功能完善|预算有限|务实之选/.test(rawReason);
        
        return {
          productName: recName,
          score: recScore,
          reason: isGenericReason ? generateSmartReason(recName, idx, rawRecs.length) : rawReason,
          compromise: r.compromise || r['妥协点'] || r['短板'] || generateSmartCompromise(recName, idx),
          priceRange: r.priceRange || r['价格区间'] || r.price || '',
          tags: Array.isArray(r.tags) ? r.tags : []
        };
      });
    } else {
      result.recommendations = [];
    }
  }
  if (intent === 'blacklist') {
    result.items = parsed.items || [];
  }
  if (intent === 'followup') {
    result.questions = parsed.questions || [];
  }

  return result;
}

// ------------------------------------------
// 智能推荐理由生成器（基于产品名称生成具体、有意义的兜底文案）
// ------------------------------------------
function generateSmartReason(productName, idx, total) {
  var name = (productName || '').toLowerCase();
  
  // 检测品类并生成对应的具体推荐理由
  if (/充电宝|移动电源|power.?bank|充电器/i.test(name)) {
    var reasons = [
      '实测容量达标率高，支持多协议快充（PD/QC），可为手机/平板/笔记本等多设备供电，品牌品控稳定售后网点覆盖广。',
      '大容量设计满足全天候使用需求，自带线或多口输出方便出行，过充过放保护机制完善，用户反馈循环寿命较长。',
      '体积重量控制优秀，便携性突出，适合通勤/差旅场景随身携带，基础快充功能齐全，性价比在同类中靠前。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/耳机|earphone|headphone|耳麦|降噪|蓝牙/i.test(name)) {
    var reasons = [
      '降噪深度和音质表现均衡，佩戴舒适度高适合长时间使用，蓝牙连接稳定延迟低，续航满足日常一周一充需求。',
      '在同价位中音质表现突出，低频量感适中不轰头，高频延伸自然不刺耳，通话降噪效果实测优于多数竞品。',
      '轻量化设计仅重XXg，入耳/头戴舒适度经过大量用户验证，支持多点连接可在手机电脑间快速切换。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/空气炸锅|电饭煲|微波炉|烤箱|豆浆机|破壁机|厨房|cooker/i.test(name)) {
    var reasons = [
      '控温精准均匀加热能力强，内胆材质安全易清洁，预设菜单丰富适合新手，实际使用噪音控制在可接受范围。',
      '容量适中满足3-4人家庭使用，操作界面直观易懂，烹饪效率较高，品牌售后响应速度和配件可获得性良好。',
      '入门价位但核心功能完整，基础烹饪模式够用，做工扎实不易出现故障，性价比适合首次尝试该品类。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/吹风机|hair.?dryer|护发|造型/i.test(name)) {
    var reasons = [
      '风速和温控表现出色，干发速度快且不伤发质，负离子功能对改善毛躁有一定帮助，人体工学握持长时间不累手。',
      '在中低价位提供了接近高端产品的核心体验，恒温技术成熟不易烫伤头皮，折叠设计便于收纳和旅行携带。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/投影仪|projector|电视|显示器|display|screen/i.test(name)) {
    var reasons = [
      '亮度和分辨率参数真实可靠，在遮光环境下画面清晰细腻，系统运行流畅投屏兼容性好，散热噪音控制合理。',
      '色彩还原准确度在同级别表现优异，支持多种接口输入适配性强，内置音响效果超出预期，适合小户型替代电视方案。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/手机|phone|iphone|华为|小米|oppo|vivo|三星|samsung/i.test(name)) {
    var reasons = [
      '性能释放和能效比表现均衡，日常使用流畅无卡顿，拍照能力在同档位竞争力强，系统更新维护周期长。',
      '屏幕素质和机身工艺达到旗舰水准，信号稳定性和通话质量经过大规模用户验证，生态系统完善配件丰富。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/笔记本|laptop|macbook|电脑|computer/i.test(name)) {
    var reasons = [
      '处理器和显卡配置组合合理，满足办公创作和轻度游戏需求，屏幕色准高适合设计和媒体工作，散热表现稳健。',
      '便携性和续航能力出色，全接口布局实用无需额外转接，键盘手感舒适适合长时间打字，品质做工对得起售价。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/相机|camera|微单|单反|镜头|镜头/i.test(name)) {
    var reasons = [
      '对焦系统和连拍能力在该价位段表现突出，画质细腻度满足专业需求，镜头群选择丰富可玩性高。',
      '机身防抖和视频能力全面升级，直出色彩科学讨喜后期空间大，适合从入门到进阶的全阶段用户。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/手表|watch|手环|band|智能穿戴|wearable/i.test(name)) {
    var reasons = [
      '健康监测数据与专业设备对比误差小，运动模式识别准确，续航能力在同类智能手表中属于偏上水平，生态互联体验顺畅。',
      '屏幕显示清晰户外可视性好，操作逻辑简洁易上手，通知同步及时可靠，外观设计兼顾运动和日常穿搭。'
    ];
    return reasons[idx % reasons.length];
  }
  if (/护肤|美妆|化妆品|面膜|精华|面霜|口红|skincare|cosmetic/i.test(name)) {
    var reasons = [
      '成分配方温和有效针对性强，经皮肤科测试刺激性低，质地和使用感在用户口碑中持续保持好评，性价比高于同效竞品。',
      '包装设计卫生方便取用控制用量，香味高级不刺眼，连续使用4周以上可见明显改善，品牌背书和成分透明度高。'
    ];
    return reasons[idx % reasons.length];
  }

  // 通用智能兜底——基于排名生成差异化文案
  var genericReasons = [
    '「' + productName + '」在核心参数和用户体验上经过市场广泛验证，综合表现在同价位段处于中上水平。主要优势在于：品质稳定性好、售后服务完善、用户口碑持续正向。建议关注官方渠道价格波动，促销入手更划算。',
    '「' + productName + '」适合对特定功能有明确需求的用户群体，其差异化亮点在于细分领域的专注度较高。相比全能型产品在某些方面更有针对性，但在通用性上可能需要适当妥协。',
    '「' + productName + '」是预算有限时的务实选择，虽然在一些非核心指标上有所取舍，但基础功能完备可靠，能满足大多数日常使用场景的需求，入门体验友好。'
  ];
  return genericReasons[idx % genericReasons.length];
}

function generateSmartCompromise(productName, idx) {
  var name = (productName || '').toLowerCase();
  
  if (/充电宝|移动电源/i.test(name)) {
    var comps = ['体积较大不便携携带', '无显示屏无法查看剩余电量', '价格比同类竞品高出15-20%', '充电发热量略大'];
    return comps[idx % comps.length];
  }
  if (/耳机|耳麦|降噪/i.test(name)) {
    var comps = ['主动降噪在高频噪声下效果一般', '佩戴超过3小时可能有压迫感', '不支持无损音频传输', 'App功能繁杂学习成本高'];
    return comps[idx % comps.length];
  }
  if (/空气炸锅|电饭煲|烤箱|厨房/i.test(name)) {
    var comps = ['预热时间较长影响效率', '清洗相对费时需要拆卸多个部件', '容量较小不适合大家庭', '操作面板按键反馈偏硬'];
    return comps[idx % comps.length];
  }
  if (/吹风机|护发/i.test(name)) {
    var comps = ['线材长度偏短使用受限', '高速挡噪音明显', '风嘴配件需另购', '机身略重长时间举着累'];
    return comps[idx % comps.length];
  }
  if (/投影仪|projector/i.test(name)) {
    var comps = ['白天使用需要完全遮光', '风扇噪音约45dB夜间明显', '内置系统应用较少需外接', '灯泡/光源更换成本高'];
    return comps[idx % comps.length];
  }
  if (/手机|phone|iphone/i.test(name)) {
    var comps = ['电池健康度一年后衰减较明显', '信号在某些复杂环境不够稳定', '存储升级成本高昂', '品牌溢价导致同配置价格偏高'];
    return comps[idx % comps.length];
  }
  
  // 通用妥协点
  var genericComps = [
    '部分高级功能/参数在同类顶级产品面前仍有差距',
    '品牌溢价使得性价比并非极致',
    '某些细节做工和用料还有提升空间'
  ];
  return genericComps[idx % genericComps.length];
}

function hashQuery(query) {
  return crypto.createHash('sha256').update(query).digest('hex');
}
