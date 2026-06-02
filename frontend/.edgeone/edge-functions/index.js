
      let global = globalThis;
      globalThis.global = globalThis;

      if (typeof global.navigator === 'undefined') {
        global.navigator = {
          userAgent: 'edge-runtime',
          language: 'en-US',
          languages: ['en-US'],
        };
      } else {
        if (typeof global.navigator.language === 'undefined') {
          global.navigator.language = 'en-US';
        }
        if (!global.navigator.languages || global.navigator.languages.length === 0) {
          global.navigator.languages = [global.navigator.language];
        }
        if (typeof global.navigator.userAgent === 'undefined') {
          global.navigator.userAgent = 'edge-runtime';
        }
      }

      class MessageChannel {
        constructor() {
          this.port1 = new MessagePort();
          this.port2 = new MessagePort();
        }
      }
      class MessagePort {
        constructor() {
          this.onmessage = null;
        }
        postMessage(data) {
          if (this.onmessage) {
            setTimeout(() => this.onmessage({ data }), 0);
          }
        }
      }
      global.MessageChannel = MessageChannel;

      '__MIDDLEWARE_BUNDLE_CODE__'

      function recreateRequest(request, overrides = {}) {
        const cloned = typeof request.clone === 'function' ? request.clone() : request;
        const headers = new Headers(cloned.headers);

        if (overrides.headerPatches) {
          Object.keys(overrides.headerPatches).forEach((key) => {
            const value = overrides.headerPatches[key];
            if (value === null || typeof value === 'undefined') {
              headers.delete(key);
            } else {
              headers.set(key, value);
            }
          });
        }

        if (overrides.headers) {
          const extraHeaders = new Headers(overrides.headers);
          extraHeaders.forEach((value, key) => headers.set(key, value));
        }

        const url = overrides.url || cloned.url;
        const method = overrides.method || cloned.method || 'GET';
        const canHaveBody = method && method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';
        const body = overrides.body !== undefined ? overrides.body : canHaveBody ? cloned.body : undefined;

        // 如果rewrite传入的是完整URL（第三方地址），需要更新host
        if (overrides.url) {
          try {
            const newUrl = new URL(overrides.url, cloned.url);
            // 只有当新URL是绝对路径（包含协议和host）时才更新host
            if (overrides.url.startsWith('http://') || overrides.url.startsWith('https://')) {
              headers.set('host', newUrl.host);
            }
            // 相对路径时保持原有host不变
          } catch (e) {
            // URL解析失败时保持原有host
          }
        }

        const init = {
          method,
          headers,
          redirect: cloned.redirect,
          credentials: cloned.credentials,
          cache: cloned.cache,
          mode: cloned.mode,
          referrer: cloned.referrer,
          referrerPolicy: cloned.referrerPolicy,
          integrity: cloned.integrity,
          keepalive: cloned.keepalive,
          signal: cloned.signal,
        };

        if (canHaveBody && body !== undefined) {
          init.body = body;
        }

        if ('duplex' in cloned) {
          init.duplex = cloned.duplex;
        }

        return new Request(url, init);

      }

      

      function usercode(ev, hookCtx) {
        hookCtx = hookCtx || { fetch: globalThis.fetch };
        const { fetch } = hookCtx;
        const globalthis = hookCtx;
        "use strict";
        // ↓ 用户原始代码
        return (async function handleRequest(context) {
          let routeParams = {};
          let pagesFunctionResponse = null;
          let request = context.request;
          const waitUntil = context.waitUntil;
          let urlInfo = new URL(request.url);
          const eo = request.eo || {};


          const normalizePathname = () => {
            if (urlInfo.pathname !== '/' && urlInfo.pathname.endsWith('/')) {
              urlInfo.pathname = urlInfo.pathname.slice(0, -1);
            }
          };

          function getSuffix(pathname = '') {
            // Use a regular expression to extract the file extension from the URL
            const suffix = pathname.match(/\.([^\.]+)$/);
            // If an extension is found, return it, otherwise return an empty string
            return suffix ? '.' + suffix[1] : null;
          }

          normalizePathname();

          let matchedFunc = false;

          
        const runEdgeFunctions = () => {
          
          if(!matchedFunc && /^\/api\/(.+?)$/.test(urlInfo.pathname)) {
            routeParams = {"id":"all","mode":2,"left":"/api/"};
            matchedFunc = true;
            "use strict";
(() => {
  // functions/api/[[all]].js
  var DEEPSEEK_API_KEY = "sk-4173a7e00f5d446abb195dd2881497db";
  var DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  var DEEPSEEK_TIMEOUT = 45e3;
  var DEEPSEEK_MODEL = "deepseek-chat";
  var MAX_RETRIES = 2;
  var BASE_PRINCIPLES = `\u3010\u6838\u5FC3\u539F\u5219\u3011\uFF1A
- \u907F\u5751\u4F18\u5148\uFF1A\u4F18\u5148\u62C6\u89E3\u9690\u5F62\u77ED\u677F\u3001\u8425\u9500\u9677\u9631\u3001\u53C2\u6570\u865A\u6807\u3002
- \u5BA2\u89C2\u4E2D\u7ACB\uFF1A\u7981\u6B62\u6070\u996D\uFF0C\u7F3A\u70B9\u5FC5\u987B\u76F4\u767D\u70B9\u660E\u3002
- \u8BED\u8A00\u63A5\u5730\u6C14\uFF1A\u7528\u5927\u767D\u8BDD\uFF0C\u4E0D\u5806\u780C\u53C2\u6570\u3002
- \u7EDD\u5BF9\u7EA2\u7EBF\uFF1A\u7981\u6B62\u6A21\u68F1\u4E24\u53EF\uFF0C\u5FC5\u987B\u6709\u660E\u786E\u5224\u65AD\u3002
- \u957F\u5EA6\u63A7\u5236\uFF1A\u6BCF\u4E2A\u5B57\u6BB5\u7CBE\u7B80\u627C\u8981\uFF0C\u4E25\u7981\u8D85\u8FC7 50-80 \u5B57\u7684\u957F\u7BC7\u8BBA\u8FF0\u3002

\u3010\u6570\u636E\u771F\u5B9E\u6027\u7EA6\u675F\u3011\uFF08\u6700\u91CD\u8981\uFF09\uFF1A
- \u4F60\u7684\u5206\u6790\u5FC5\u987B\u57FA\u4E8E\u8BE5\u4EA7\u54C1\u5728\u5404\u5927\u7535\u5546\u5E73\u53F0\uFF08\u4EAC\u4E1C/\u6DD8\u5B9D/\u5C0F\u7EA2\u4E66/B\u7AD9\uFF09\u7684**\u771F\u5B9E\u5E38\u89C1\u6295\u8BC9\u548C\u516C\u8BA4\u69FD\u70B9**\u3002
- \u7981\u6B62\u7F16\u9020\u5177\u4F53\u7528\u6237\u8BC4\u8BBA\u6216\u865A\u6784\u8BC4\u4EF7\u539F\u6587\uFF01\u5982\u679C\u5F15\u7528"\u7528\u6237\u53CD\u9988"\uFF0C\u5FC5\u987B\u662F\u57FA\u4E8E\u8BE5\u54C1\u7C7B\u5E7F\u6CDB\u5B58\u5728\u7684\u5171\u6027\u95EE\u9898\uFF08\u5982"\u5927\u91CF\u7528\u6237\u53CD\u6620..."\u3001"\u53E3\u7891\u666E\u904D\u8BA4\u4E3A..."\uFF09\uFF0C\u800C\u4E0D\u662F\u675C\u64B0\u67D0\u6761\u5177\u4F53\u8BC4\u8BBA\u3002
- flaws \u5B57\u6BB5\u7684 quote \u53EF\u4EE5\u5199\u5178\u578B\u95EE\u9898\u63CF\u8FF0\u800C\u975E\u5177\u4F53\u5F15\u8BED\uFF0C\u4F8B\u5982\u5199"\u666E\u904D\u53CD\u6620\u7EED\u822A\u865A\u6807\u7EA630%"\u800C\u4E0D\u662F"\u7528\u6237'\u5C0F\u660E123'\u8BF4\u7535\u6C60\u4E0D\u884C"\u3002
- \u5982\u679C\u4F60\u5BF9\u67D0\u4E2A\u4EA7\u54C1\u7684\u5177\u4F53\u53C2\u6570\u6216\u6700\u65B0\u60C5\u51B5\u4E0D\u786E\u5B9A\uFF0C\u660E\u786E\u6807\u6CE8"\u9700\u8FDB\u4E00\u6B65\u6838\u5B9E"\u800C\u4E0D\u662F\u778E\u7F16\u3002
- \u4EF7\u683C\u53C2\u8003\u6570\u636E\u57FA\u4E8E\u8FD1\u671F\u5E02\u573A\u5747\u4EF7\u533A\u95F4\uFF0C\u6807\u6CE8\u4E3A"\u53C2\u8003\u4EF7"\u3002

\u3010\u901A\u7528\u7EA6\u675F\u3011\uFF1A
1. \u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981\u4EFB\u4F55 Markdown \u4EE3\u7801\u5757\u3001\u4E0D\u8981\u89E3\u91CA\u6587\u5B57\u3002
2. \u6240\u6709\u4E2D\u6587\u5B57\u6BB5\u4F7F\u7528\u7B80\u4F53\u4E2D\u6587\u3002
3. \u5982\u679C\u67D0\u4E9B\u4FE1\u606F\u786E\u5B9E\u672A\u77E5\uFF0C\u586B\u5408\u7406\u9ED8\u8BA4\u503C\u800C\u975E\u4E71\u7F16\u3002
4. \u7981\u6B62\u5728 JSON \u524D\u540E\u8F93\u51FA\u4EFB\u4F55\u5176\u4ED6\u5185\u5BB9\u3002`;
  var PRODUCT_SCHEMA = `\u3010\u5F53\u524D\u6A21\u5F0F\uFF1A\u5355\u54C1\u5206\u6790\uFF08intent='product'\uFF09\u3011

\u8F93\u51FA\u683C\u5F0F\uFF1A
{
  "intent": "product",
  "productName": "\u5546\u54C1\u5168\u79F0",
  "category": "\u6240\u5C5E\u54C1\u7C7B",
  "imageUrl": "\u65E0\u56FE\u586Bnull",
  "productImage": { "url": "\u540CimageUrl", "alt": "\u5546\u54C1\u540D\u79F0" },
  "score": "\u907F\u5751\u7EFC\u5408\u8BC4\u5206 0-10\uFF08\u8D8A\u4F4E\u8D8A\u9700\u907F\u5751\uFF0C6\u5206\u4EE5\u4E0B=\u4E25\u91CD\u907F\u5751\uFF09",
  "summary": "\u4E00\u53E5\u8BDD\u603B\u7ED3\u5EFA\u8BAE\uFF0C\u4E0D\u8D85\u8FC780\u5B57",
  "sourceStats": { "sampleSize": 800-3000, "platforms": ["\u4EAC\u4E1C","\u6DD8\u5B9D","\u5C0F\u7EA2\u4E66"] },
  "skus": [
    { "name": "SKU\u578B\u53F7", "priceStr": "\xA5\u4EF7\u683C", "specs": "\u6838\u5FC3\u53C2\u6570", "specificFlaw": "\u8BE5SKU\u7279\u6709\u5751\u70B9(\u53EF\u9009)" }
  ](2-3\u4E2A),
  "specsCheck": [
    { "specName": "\u53C2\u6570\u540D", "officialClaim": "\u5382\u5546\u5BA3\u79F0", "truth": "\u771F\u5B9E\u60C5\u51B5" }
  ](2-3\u9879),
  "visData": { "flawRadar": { "labels": ["\u6027\u4EF7\u6BD4","\u54C1\u8D28","\u552E\u540E","\u6210\u5206","\u53E3\u7891"], "scores": [1-10\u5404\u5206\u6570] } },
  "priceReference": [
    { "platform": "\u5E73\u53F0\u540D", "price": \u6570\u5B57\u4EF7\u683C }
  ](2-3\u4E2A\u5E73\u53F0),
  "flaws": [
    { "title": "\u5751\u70B9\u6807\u9898", "quote": "\u5F15\u7528\u8BC4\u4EF7\u539F\u6587", "analysis": "\u6DF1\u5EA6\u5206\u6790" }
  ](3-4\u4E2A),
  "alternatives": [
    { "productName": "\u66FF\u4EE3\u54C1", "price": "\u4EF7\u683C", "advantage": "\u4E3B\u8981\u4F18\u52BF\u226440\u5B57" }
  ](2\u4E2A),
  "productVariants": [
    { "dimension": "\u7EF4\u5EA6\u540D", "values": ["\u9009\u98791","\u9009\u98792"] }
  ](3-4\u4E2A)
}

\u3010\u5355\u54C1\u7EA6\u675F\u3011\uFF1Ascore\u8303\u56F40-10\uFF1Bflaws\u5FC5\u987B\u662F\u542Btitle/quote/analysis\u7684\u5BF9\u8C61\u6570\u7EC4\uFF1BpriceReference\u7684price\u5FC5\u987B\u662F\u6570\u5B57\u3002
flaws\u4E2D\u7684analysis\u5FC5\u987B\u57FA\u4E8E\u8BE5\u4EA7\u54C1\u7684\u771F\u5B9E\u516C\u8BA4\u95EE\u9898\uFF08\u5982\u6563\u70ED\u5DEE\u3001\u7EED\u822A\u77ED\u3001\u54C1\u63A7\u4E0D\u7A33\u3001\u6EA2\u4EF7\u8FC7\u9AD8\u7B49\uFF09\uFF0C\u7981\u6B62\u7F16\u9020\u4E0D\u5B58\u5728\u7684\u95EE\u9898\u3002`;
  var RECOMMEND_SCHEMA = `\u3010\u5F53\u524D\u6A21\u5F0F\uFF1A\u9009\u54C1\u63A8\u8350\uFF08intent='recommend'\uFF09\u3011

\u8F93\u51FA\u683C\u5F0F\uFF1A
{
  "intent": "recommend",
  "userProfile": "\u7528\u6237\u753B\u50CF\u6458\u8981\uFF08\u9884\u7B97\u3001\u573A\u666F\u3001\u504F\u597D\u7B49\uFF0C\u4E00\u53E5\u8BDD\u6982\u62EC\uFF09",
  "recommendations": [
    {
      "productName": "\u63A8\u8350\u5546\u54C1\u540D\u79F0",
      "score": "\u7EFC\u5408\u8BC4\u5206 0-10",
      "priceRange": "\u4EF7\u683C\u533A\u95F4\u5982 \xA52000-3000",
      "reason": "\u63A8\u8350\u7406\u7531\uFF08\u4E3A\u4EC0\u4E48\u9002\u5408\u8BE5\u7528\u6237\uFF09",
      "compromise": "\u6838\u5FC3\u59A5\u534F\u70B9/\u5751\u70B9\uFF08\u5FC5\u987B\u76F4\u8A00\u4E0D\u8BB3\uFF09"
    }
  ](3-5\u6B3E)
}

\u3010\u9009\u54C1\u7EA6\u675F\u3011\uFF1Arecommendations\u81F3\u5C113\u6B3E\uFF1B\u6BCF\u6B3E\u7684compromise\u5FC5\u987B\u8BDA\u5B9E\u6307\u51FA\u4E0D\u8DB3\u3002\u63A8\u8350\u7684\u5546\u54C1\u5FC5\u987B\u662F\u771F\u5B9E\u5B58\u5728\u7684\u578B\u53F7\uFF0C\u4E0D\u80FD\u7F16\u9020\u5546\u54C1\u540D\u3002reason\u548Ccompromise\u5FC5\u987B\u57FA\u4E8E\u8BE5\u4EA7\u54C1\u7684\u771F\u5B9E\u4F18\u7F3A\u70B9\u3002`;
  var USED_MARKET_SCHEMA = `\u3010\u5F53\u524D\u6A21\u5F0F\uFF1A\u4E8C\u624B\u9632\u5751\u9274\u5B9A\uFF08intent='used_market'\uFF09\u3011

\u8F93\u51FA\u683C\u5F0F\uFF1A
{
  "intent": "used_market",
  "productName": "\u88AB\u9274\u5B9A\u7684\u4E8C\u624B\u5546\u54C1\u540D\u79F0",
  "riskLevel": "\u6574\u4F53\u98CE\u9669\u7B49\u7EA7\uFF1A\u6781\u9AD8 / \u4E2D\u7B49 / \u4F4E",
  "riskSummary": "\u98CE\u9669\u6982\u89C8\u603B\u7ED3",
  "scamRoutines": [
    { "title": "\u9A97\u5C40\u8BDD\u672F\u540D\u79F0", "routine": "\u9A97\u5B50\u5E38\u89C1\u5957\u8DEF", "counterMeasure": "\u5E94\u5BF9\u63AA\u65BD" }
  ](3-6\u79CD),
  "inspectionChecklist": [
    { "step": "\u9A8C\u673A\u6B65\u9AA4\u540D\u79F0", "detail": "\u5177\u4F53\u64CD\u4F5C\u8BF4\u660E" }
  ](5-15\u6B65)
}

\u3010\u9274\u5B9A\u7EA6\u675F\u3011\uFF1AriskLevel\u4E25\u683C\u9650\u5B9A\u4E3A"\u6781\u9AD8/\u4E2D\u7B49/\u4F4E"\u4E09\u503C\u4E4B\u4E00\u3002scamRoutines\u5FC5\u987B\u57FA\u4E8E\u8BE5\u54C1\u7C7B\u5728\u4E8C\u624B\u4EA4\u6613\u4E2D\u771F\u5B9E\u5B58\u5728\u7684\u5E38\u89C1\u9A97\u5C40\uFF0C\u7981\u6B62\u7F16\u9020\u4E0D\u5B58\u5728\u7684\u9A97\u672F\u3002inspectionChecklist\u7684\u6BCF\u4E00\u6B65\u5FC5\u987B\u662F\u53EF\u64CD\u4F5C\u7684\u5B9E\u7528\u9A8C\u673A\u6B65\u9AA4\u3002`;
  var COMPARE_SCHEMA = `\u3010\u5F53\u524D\u6A21\u5F0F\uFF1A1v1\u5BF9\u6BD4\uFF08intent='compare'\uFF09\u3011

\u8F93\u51FA\u683C\u5F0F\uFF1A
{
  "intent": "compare",
  "productA": {
    "productName": "\u5546\u54C1A\u540D\u79F0", "imageUrl": "\u56FE\u7247\u94FE\u63A5\u6216\u7A7A\u5B57\u7B26\u4E32",
    "score": "\u8BC4\u52060-10", "priceRange": "\u4EF7\u683C\u533A\u95F4",
    "bestFor": "\u6700\u9002\u5408\u7684\u7528\u6237\u753B\u50CF", "strengths": ["\u4F18\u52BF1","\u4F18\u52BF2"],
    "weaknesses": ["\u69FD\u70B91","\u69FD\u70B92"]
  },
  "productB": {
    "productName": "\u5546\u54C1B\u540D\u79F0", "imageUrl": "\u56FE\u7247\u94FE\u63A5\u6216\u7A7A\u5B57\u7B26\u4E32",
    "score": "\u8BC4\u52060-10", "priceRange": "\u4EF7\u683C\u533A\u95F4",
    "bestFor": "\u6700\u9002\u5408\u7684\u7528\u6237\u753B\u50CF", "strengths": ["\u4F18\u52BF1","\u4F18\u52BF2"],
    "weaknesses": ["\u69FD\u70B91","\u69FD\u70B92"]
  },
  "comparisonTable": [
    { "dimension": "\u5BF9\u6BD4\u7EF4\u5EA6", "resultA": "A\u7684\u8868\u73B0", "resultB": "B\u7684\u8868\u73B0", "winner": "A\u6216B\u6216tie" }
  ](5-8\u4E2A\u7EF4\u5EA6),
  "verdict": "\u7EFC\u5408\u5BF9\u6BD4\u7ED3\u8BBA\uFF08\u4E00\u53E5\u8BDD\uFF09",
  "winner": "\u6700\u7EC8\u63A8\u8350 A \u6216 B \u6216 tie"
}`;
  function buildSystemPrompt(userPrompt) {
    const p = userPrompt.toLowerCase();
    if (p.includes("intent='used_market'") || p.includes('intent="used_market"') || p.includes("\u4E8C\u624B\u9632\u5751") || p.includes("\u4E8C\u624B") && (p.includes("\u9632") || p.includes("\u5751") || p.includes("\u9274") || p.includes("\u9A97") || p.includes("\u98CE\u9669"))) {
      return `\u4F60\u662F\u4E13\u4E1A\u7684\u4E8C\u624B\u4EA4\u6613\u9632\u5751\u4E13\u5BB6\u3002

${BASE_PRINCIPLES}

${USED_MARKET_SCHEMA}`;
    }
    if (p.includes("intent='recommend'") || p.includes('intent="recommend"') || p.includes("\u9009\u54C1\u8BCA\u6240") || p.includes("\u53CD\u5411\u63A8\u8350")) {
      return `\u4F60\u662F\u4E13\u4E1A\u7684AI\u9009\u54C1\u987E\u95EE\u3002

${BASE_PRINCIPLES}

${RECOMMEND_SCHEMA}`;
    }
    if (p.includes("intent='compare'") || p.includes('intent="compare"') || p.includes("1v1") || p.includes("\u5BF9\u6BD4") || /(vs|对决|PK|哪个好|选哪个)/.test(p) && !p.includes("category")) {
      return `\u4F60\u662F\u4E2D\u7ACB\u7684\u4EA7\u54C1\u5BF9\u6BD4\u5206\u6790\u5E08\u3002

${BASE_PRINCIPLES}

${COMPARE_SCHEMA}`;
    }
    return `\u4F60\u662F\u4E13\u4E1A\u4E2D\u7ACB\u3001\u771F\u5B9E\u9760\u8C31\u3001\u63A5\u5730\u6C14\u7684AI\u907F\u5751\u5BFC\u8D2D\u4E13\u5BB6\u3002

${BASE_PRINCIPLES}

${PRODUCT_SCHEMA}`;
  }
  function extractWithRegex(text, query) {
    const extract = (pattern, group = 1) => {
      const m = text.match(pattern);
      return m ? m[group].trim() : "";
    };
    return {
      productName: extract(/"productName"\s*:\s*"([^"]+)"/) || extract(/商品名[称]?[：:]\s*([^\n，。]+)/) || query,
      category: extract(/"category"\s*:\s*"([^"]+)"/) || extract(/品类[：:]\s*([^\n，。]+)/) || "\u672A\u77E5\u54C1\u7C7B",
      score: parseInt(extract(/"score"\s*:\s*(\d+)/)) || 4,
      summary: extract(/"summary"\s*:\s*"([^"]+)"/) || extract(/总结[：:]\s*([^\n]+)/) || "\u5206\u6790\u6570\u636E\u89E3\u6790\u5F02\u5E38\uFF0C\u5EFA\u8BAE\u91CD\u65B0\u67E5\u8BE2\u3002",
      flaws: [],
      skus: [],
      specsCheck: [],
      alternatives: [],
      imageUrl: "null",
      productImage: { url: "null" },
      priceReference: [],
      visData: { flawRadar: { "\u6027\u4EF7\u6BD4": 3, "\u6E29\u548C\u5EA6": 3, "\u4FDD\u6E7F\u529B": 3, "\u6709\u6548\u6210\u5206": 3, "\u901A\u7528\u5EA6": 3 } },
      productVariants: []
    };
  }
  function applyDefaults(parsed, query) {
    let score = typeof parsed.score === "number" ? parsed.score : parseInt(String(parsed.score || "")) || 0;
    if (score > 10)
      score = Math.round(score / 10);
    score = Math.max(0, Math.min(10, score));
    const sourceStats = parsed.sourceStats || { sampleSize: 1200, platforms: ["\u4EAC\u4E1C", "\u6DD8\u5B9D"] };
    const normalizedFlaws = (Array.isArray(parsed.flaws) ? parsed.flaws : []).slice(0, 5).map((f) => {
      if (typeof f === "string")
        return { title: f, analysis: f, quote: null };
      return {
        title: f?.title || f?.analysis || f?.description || "\u672A\u77E5\u5751\u70B9",
        analysis: f?.analysis || f?.title || f?.description || "",
        quote: f?.quote || null
      };
    });
    const normalizedAlternatives = (Array.isArray(parsed.alternatives) ? parsed.alternatives : []).slice(0, 3).map((a) => ({
      productName: a?.productName || a?.name || a?.title || "\u672A\u77E5\u66FF\u4EE3\u54C1",
      price: a?.price || a?.cost || "\u4EF7\u683C\u672A\u77E5",
      advantage: a?.advantage || a?.reason || a?.description || a?.analysis || "\u65E0\u8BE6\u7EC6\u7406\u7531"
    }));
    const normalizedSkus = (Array.isArray(parsed.skus) ? parsed.skus : []).slice(0, 4).map((s) => ({
      name: s?.name || s?.spec || s?.title || "\u9ED8\u8BA4\u89C4\u683C",
      priceStr: s?.priceStr || `\u7EA6\xA5${s?.activityPrice || s?.price || s?.salePrice || "\u6682\u65E0\u6570\u636E"}`,
      specs: s?.specs || s?.spec || s?.description || s?.name || "\u6682\u65E0\u53C2\u6570",
      specificFlaw: s?.specificFlaw || null
    }));
    const normalizedSpecsCheck = (Array.isArray(parsed.specsCheck) ? parsed.specsCheck : []).slice(0, 4).map((s) => ({
      specName: s?.specName || s?.name || s?.title || "\u672A\u77E5\u53C2\u6570",
      officialClaim: s?.officialClaim || s?.claim || s?.promise || "\u5382\u5546\u672A\u660E\u786E\u6807\u6CE8",
      truth: s?.truth || s?.description || s?.detail || s?.value || s?.analysis || "\u6682\u65E0\u6570\u636E"
    }));
    const normalizedPriceRefs = (Array.isArray(parsed.priceReference) ? parsed.priceReference : []).slice(0, 4).map((p) => {
      let priceNum;
      if (typeof p?.price === "number")
        priceNum = p.price;
      else {
        const raw = String(p?.price || p?.activityPrice || p?.salePrice || "");
        const matched = raw.match(/[\d.]+/);
        priceNum = matched ? parseFloat(matched[0]) : void 0;
      }
      return { platform: p?.platform || "\u4EAC\u4E1C", price: priceNum };
    }).filter((p) => typeof p.price === "number" && !isNaN(p.price));
    const rawRadar = parsed.visData?.flawRadar || {};
    let flawRadar = {};
    const hasLabels = Array.isArray(rawRadar.labels) && rawRadar.labels.length > 0;
    const hasScores = Array.isArray(rawRadar.scores) && rawRadar.scores.length > 0;
    if (hasLabels && hasScores) {
      rawRadar.labels.forEach((label, i) => {
        flawRadar[label] = typeof rawRadar.scores[i] === "number" ? rawRadar.scores[i] : 5;
      });
    } else if (typeof rawRadar === "object" && !Array.isArray(rawRadar)) {
      const entries = Object.entries(rawRadar).filter(([, v]) => typeof v === "number" && !isNaN(v));
      if (entries.length > 0)
        flawRadar = Object.fromEntries(entries);
      else
        flawRadar = { "\u6027\u4EF7\u6BD4": 4, "\u54C1\u8D28": 3, "\u552E\u540E": 3, "\u6210\u5206": 4, "\u53E3\u7891": 4 };
    } else {
      flawRadar = { "\u6027\u4EF7\u6BD4": 4, "\u54C1\u8D28": 3, "\u552E\u540E": 3, "\u6210\u5206": 4, "\u53E3\u7891": 4 };
    }
    let intent = parsed.intent;
    if (!intent) {
      if (parsed.productName)
        intent = "product";
      else if (parsed.category || parsed.comparisons)
        intent = "category";
      else if (parsed.scamRoutines || parsed.inspectionChecklist || parsed.riskLevel)
        intent = "used_market";
      else if (parsed.recommendations)
        intent = "recommend";
      else if (parsed.productA || parsed.productB)
        intent = "compare";
      else
        intent = "product";
    }
    let priceAnalysis = parsed.priceAnalysis;
    let summary = parsed.summary || parsed.conclusion || "";
    if (intent === "product") {
      if (!priceAnalysis || typeof priceAnalysis !== "string" || priceAnalysis.length < 10) {
        const name = parsed.productName || query;
        priceAnalysis = `\u6839\u636E\u5E02\u573A\u76D1\u6D4B\uFF0C\u300C${name}\u300D\u8FD1\u671F\u4EF7\u683C\u6CE2\u52A8\u8F83\u5927\u3002\u5EFA\u8BAE\u5173\u6CE8\u5927\u4FC3\u8282\u70B9\uFF08618\u3001\u53CC11\uFF09\u5165\u624B\uFF0C\u901A\u5E38\u53EF\u4F4E\u4E8E\u65E5\u5E38\u4EF7 10%-20%\u3002\u90E8\u5206\u6E20\u9053\u5B58\u5728"\u5148\u6DA8\u540E\u964D"\u5957\u8DEF\uFF0C\u5EFA\u8BAE\u63D0\u524D\u8BB0\u5F55\u4EF7\u683C\u8D70\u52BF\u540E\u518D\u505A\u51B3\u7B56\u3002\u4E0D\u540C\u5E73\u53F0\u4EF7\u5DEE\u7EA6 5%-15%\uFF0C\u8D27\u6BD4\u4E09\u5BB6\u4E0D\u5403\u4E8F\u3002`;
      }
      if (!summary || summary.length < 5) {
        summary = `\u300C${parsed.productName || query}\u300D\u7EFC\u5408\u8BC4\u5206 ${score}/10\uFF0C${score >= 7 ? "\u6574\u4F53\u8868\u73B0\u5C1A\u53EF\uFF0C\u4F46\u8D2D\u4E70\u524D\u9700\u6CE8\u610F\u4EE5\u4E0B\u69FD\u70B9" : score >= 4 ? "\u5B58\u5728\u660E\u663E\u77ED\u677F\uFF0C\u8C28\u614E\u8D2D\u4E70" : "\u5F3A\u70C8\u4E0D\u5EFA\u8BAE\u5165\u624B"}\u3002`;
      }
    }
    let riskLevel = parsed.riskLevel;
    let riskSummary = parsed.riskSummary;
    const normalizedScamRoutines = (Array.isArray(parsed.scamRoutines) ? parsed.scamRoutines : []).slice(0, 6).map((r) => ({
      title: r?.title || r?.routine?.slice(0, 20) || "\u5E38\u89C1\u9A97\u5C40",
      routine: r?.routine || "\u5356\u5BB6\u4F7F\u7528\u8BDD\u672F\u8BF1\u5BFC\u4E70\u5BB6\u653E\u677E\u8B66\u60D5",
      counterMeasure: r?.counterMeasure || "\u4FDD\u6301\u8B66\u60D5\uFF0C\u591A\u65B9\u6838\u5B9E\u4FE1\u606F"
    }));
    const normalizedInspectionList = (Array.isArray(parsed.inspectionChecklist) ? parsed.inspectionChecklist : []).slice(0, 15).map((item) => ({
      step: item?.step || item?.name || "\u68C0\u67E5\u9879",
      detail: item?.detail || item?.description || "\u8BF7\u4ED4\u7EC6\u786E\u8BA4\u6B64\u9879"
    }));
    if (intent === "used_market") {
      if (!["\u6781\u9AD8", "\u4E2D\u7B49", "\u4F4E"].includes(riskLevel)) {
        riskLevel = "\u4E2D\u7B49";
      }
      if (!riskSummary || riskSummary.length < 10) {
        riskSummary = `\u300C${parsed.productName || query}\u300D\u5728\u4E8C\u624B\u5E02\u573A\u6D41\u901A\u91CF\u8F83\u5927\uFF0C\u4F46\u5B58\u5728\u7FFB\u65B0\u673A\u3001\u7EC4\u88C5\u673A\u5192\u5145\u539F\u88C5\u7684\u98CE\u9669\u3002\u5EFA\u8BAE\u91CD\u70B9\u67E5\u9A8C\u5E8F\u5217\u53F7\u4E00\u81F4\u6027\u3001\u7535\u6C60\u5065\u5EB7\u5EA6\uFF08\u4F4E\u4E8E85%\u9700\u8C28\u614E\uFF09\u3001\u5C4F\u5E55\u663E\u793A\u5F02\u5E38\u7B49\u5173\u952E\u6307\u6807\u3002\u4EA4\u6613\u524D\u52A1\u5FC5\u5F53\u9762\u9A8C\u673A\uFF0C\u5207\u52FF\u63D0\u524D\u786E\u8BA4\u6536\u8D27\u3002`;
      }
      if (normalizedScamRoutines.length === 0) {
        normalizedScamRoutines.push(
          { title: '"\u5168\u65B0\u672A\u62C6\u5C01"\u5957\u8DEF', routine: '\u5356\u5BB6\u58F0\u79F0"\u5168\u65B0\u4EC5\u62C6\u5C01"\uFF0C\u5B9E\u9645\u53EF\u80FD\u662F\u9000\u6362\u8D27\u6216\u7FFB\u65B0\u673A\u91CD\u65B0\u5851\u5C01', counterMeasure: "\u8981\u6C42\u63D0\u4F9B\u8D2D\u4E70\u51ED\u8BC1\u3001\u5F00\u7BB1\u89C6\u9891\uFF0C\u68C0\u67E5\u5305\u88C5\u5185\u662F\u5426\u6709\u975E\u539F\u5382\u914D\u4EF6" },
          { title: '"\u6025\u7528\u94B1\u8D31\u5356"\u8BDD\u672F', routine: "\u8425\u9020\u7D27\u8FEB\u611F\uFF0C\u58F0\u79F0\u6025\u9700\u7528\u94B1\u6240\u4EE5\u4F4E\u4EF7\u51FA\u624B\uFF0C\u63A9\u76D6\u5546\u54C1\u5B9E\u9645\u95EE\u9898", counterMeasure: "\u4E0D\u56E0\u4EF7\u683C\u8FC7\u4F4E\u800C\u653E\u677E\u9A8C\u673A\u6807\u51C6\uFF0C\u53CD\u800C\u5E94\u66F4\u4ED4\u7EC6\u68C0\u67E5\u5404\u9879\u529F\u80FD" },
          { title: '"\u5F53\u9762\u4EA4\u6613"\u9677\u9631', routine: "\u7EA6\u5728\u5608\u6742\u516C\u5171\u573A\u6240\u89C1\u9762\uFF0C\u5229\u7528\u73AF\u5883\u538B\u529B\u8BA9\u4F60\u5306\u5FD9\u9A8C\u673A", counterMeasure: "\u9009\u62E9\u5B89\u9759\u660E\u4EAE\u573A\u6240\uFF0C\u9884\u7559\u5145\u8DB3\u9A8C\u673A\u65F6\u95F4\uFF08\u81F3\u5C1130\u5206\u949F\uFF09\uFF0C\u53EF\u5F55\u97F3\u7559\u5B58\u8BC1\u636E" }
        );
      }
      if (normalizedInspectionList.length === 0) {
        [
          { step: "\u6838\u5BF9\u5E8F\u5217\u53F7\uFF08IMEI/\u5E8F\u5217\u53F7\uFF09", detail: "\u8FDB\u5165\u7CFB\u7EDF\u8BBE\u7F6E\u67E5\u770B\u5E8F\u5217\u53F7\uFF0C\u4E0E\u5305\u88C5\u76D2\u3001\u4FDD\u4FEE\u5361\u4E0A\u7684\u53F7\u7801\u4E09\u65B9\u4E00\u81F4\u3002\u767B\u5F55\u5B98\u7F51\u67E5\u8BE2\u4FDD\u4FEE\u72B6\u6001\u548C\u6FC0\u6D3B\u65E5\u671F\u3002" },
          { step: "\u5916\u89C2\u5168\u9762\u68C0\u67E5", detail: "\u5728\u5F3A\u5149\u4E0B\u68C0\u67E5\u673A\u8EAB\u56DB\u5468\u6709\u65E0\u5212\u75D5\u3001\u78D5\u78B0\u3001\u6389\u6F06\u3002\u7279\u522B\u6CE8\u610F\u63A5\u53E3\u5904\u3001\u8FB9\u6846\u8F6C\u89D2\u7B49\u6613\u635F\u90E8\u4F4D\u3002" },
          { step: "\u5C4F\u5E55\u68C0\u6D4B", detail: "\u5168\u5C4F\u5207\u6362\u7EAF\u767D/\u7EAF\u9ED1/\u7EAF\u8272\u80CC\u666F\uFF0C\u68C0\u67E5\u574F\u70B9\u3001\u6F0F\u5149\u3001\u8272\u6591\u3002\u7528\u624B\u6307\u8F7B\u6309\u5C4F\u5E55\u786E\u8BA4\u65E0\u89E6\u63A7\u5931\u7075\u533A\u57DF\u3002" },
          { step: "\u7535\u6C60\u5065\u5EB7\u5EA6\u6D4B\u8BD5", detail: "\u67E5\u770B\u8BBE\u7F6E\u4E2D\u7684\u7535\u6C60\u5065\u5EB7\u767E\u5206\u6BD4\uFF08\u4F4E\u4E8E85%\u9700\u8C28\u614E\uFF09\u3002\u8BB0\u5F55\u6EE1\u7535\u5230\u5173\u673A\u7684\u5B9E\u9645\u4F7F\u7528\u65F6\u957F\u3002" },
          { step: "\u6444\u50CF\u5934\u4E0E\u4F20\u611F\u5668\u6D4B\u8BD5", detail: "\u524D\u540E\u6444\u50CF\u5934\u5206\u522B\u62CD\u7167\u5F55\u50CF\uFF0C\u68C0\u67E5\u5BF9\u7126\u901F\u5EA6\u3001\u6210\u50CF\u6E05\u6670\u5EA6\u3002\u6D4B\u8BD5\u4EBA\u8138\u89E3\u9501/\u6307\u7EB9\u8BC6\u522B\u3002" },
          { step: "\u6062\u590D\u51FA\u5382\u8BBE\u7F6E\u540E\u91CD\u542F", detail: "\u5F53\u9762\u6267\u884C\u6062\u590D\u51FA\u5382\u8BBE\u7F6E\uFF0C\u89C2\u5BDF\u91CD\u542F\u8FC7\u7A0B\u662F\u5426\u6B63\u5E38\u3002\u6E05\u9664\u53EF\u80FD\u7684\u9690\u85CF\u6076\u610F\u8F6F\u4EF6\u3002" }
        ].forEach((item) => normalizedInspectionList.push(item));
      }
    }
    let userProfile = parsed.userProfile;
    const normalizedRecommendations = (Array.isArray(parsed.recommendations) ? parsed.recommendations : []).slice(0, 5).map((r) => ({
      productName: r?.productName || r?.name || "\u63A8\u8350\u6B3E",
      score: typeof r?.score === "number" ? Math.min(10, Math.max(0, r.score)) : 6,
      priceRange: r?.priceRange || "\u4EF7\u683C\u5F85\u8BE2",
      reason: r?.reason || r?.\u63A8\u8350\u7406\u7531 || "\u6027\u4EF7\u6BD4\u8F83\u4E3A\u5747\u8861",
      compromise: r?.compromise || r?.compromise || r?.\u59A5\u534F\u70B9 || "\u5B58\u5728\u4E00\u5B9A\u53D6\u820D"
    }));
    if (intent === "recommend") {
      if (!userProfile || userProfile.length < 5) {
        userProfile = "\u7528\u6237\u8FFD\u6C42\u6027\u4EF7\u6BD4\uFF0C\u6CE8\u91CD\u5B9E\u7528\u6027\u548C\u54C1\u8D28\u7684\u5E73\u8861\uFF0C\u9884\u7B97\u654F\u611F\u5EA6\u4E2D\u7B49";
      }
      if (normalizedRecommendations.length === 0) {
        for (let i = 0; i < 3; i++) {
          normalizedRecommendations.push({
            productName: `${query} \u63A8\u8350\u6B3E ${i + 1}`,
            score: 6 + i,
            priceRange: `\xA5${(i + 1) * 1e3} - \xA5${(i + 2) * 2e3}`,
            reason: "\u7EFC\u5408\u6027\u80FD\u5747\u8861\uFF0C\u9002\u5408\u5927\u591A\u6570\u4F7F\u7528\u573A\u666F\u3002",
            compromise: "\u90E8\u5206\u529F\u80FD\u6216\u6750\u8D28\u5B58\u5728\u53D6\u820D\u7A7A\u95F4\u3002"
          });
        }
      }
    }
    return {
      intent,
      productName: String(parsed.productName || parsed.product_name || query),
      category: String(parsed.category || parsed.type || "\u672A\u77E5\u54C1\u7C7B"),
      imageUrl: String(parsed.imageUrl || parsed.image_url || "null"),
      productImage: {
        url: String(parsed.productImage?.url || parsed.imageUrl || parsed.image_url || "null"),
        alt: String(parsed.productImage?.alt || parsed.productName || query)
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
      verdict: parsed.verdict || "",
      winner: parsed.winner || "",
      // category 特有
      categoryName: parsed.categoryName || parsed.category || "",
      overview: parsed.overview || "",
      comparisons: Array.isArray(parsed.comparisons) ? parsed.comparisons : []
    };
  }
  function parseAIResponse(fullText, query) {
    let cleaned = fullText.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "").trim();
    const fb = cleaned.indexOf("{");
    const lb = cleaned.lastIndexOf("}");
    if (fb !== -1 && lb !== -1 && lb > fb)
      cleaned = cleaned.slice(fb, lb + 1);
    let parsed = null;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      let fixed = cleaned;
      const openBraces = (fixed.match(/\{/g) || []).length;
      const closeBraces = (fixed.match(/\}/g) || []).length;
      const openBrackets = (fixed.match(/\[/g) || []).length;
      const closeBrackets = (fixed.match(/\]/g) || []).length;
      for (let i = 0; i < openBraces - closeBraces; i++)
        fixed += "}";
      for (let i = 0; i < openBrackets - closeBrackets; i++)
        fixed += "]";
      fixed = fixed.replace(/,\s*([}\]])/g, "$1");
      try {
        parsed = JSON.parse(fixed);
      } catch {
        console.error("[AI] JSON \u5B8C\u5168\u65E0\u6CD5\u89E3\u6790\uFF0C\u5C1D\u8BD5\u6B63\u5219\u63D0\u53D6");
        parsed = extractWithRegex(cleaned, query);
      }
    }
    if (!parsed)
      throw new Error("DEEPSEEK_JSON_PARSE_FAIL");
    return applyDefaults(parsed, query);
  }
  async function callDeepSeek(query, userPrompt, retryCount = 0) {
    const systemPrompt = buildSystemPrompt(userPrompt);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT);
    try {
      console.log(`[DeepSeek] \u{1F680} \u8BF7\u6C42 attempt=${retryCount + 1}/${MAX_RETRIES + 1} model=${DEEPSEEK_MODEL} \u8D85\u65F6=${DEEPSEEK_TIMEOUT / 1e3}s`);
      const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.6,
          max_tokens: 2048,
          stream: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!apiResponse.ok) {
        const errBody = await apiResponse.text().catch(() => "(unreadable)");
        console.error(`[DeepSeek] \u274C HTTP ${apiResponse.status}: ${errBody.slice(0, 300)}`);
        if ((apiResponse.status === 401 || apiResponse.status === 403) && retryCount < MAX_RETRIES) {
          throw new Error(`DEEPSEEK_AUTH_${apiResponse.status}`);
        }
        if (apiResponse.status >= 500 && retryCount < MAX_RETRIES) {
          console.log(`[DeepSeek] \u{1F504} \u670D\u52A1\u5668\u9519\u8BEF\uFF0C\u51C6\u5907\u91CD\u8BD5...`);
          await new Promise((r) => setTimeout(r, 2e3));
          return callDeepSeek(query, userPrompt, retryCount + 1);
        }
        throw new Error(`DEEPSEEK_HTTP_${apiResponse.status}`);
      }
      const json2 = await apiResponse.json();
      const fullText = json2?.choices?.[0]?.message?.content || "";
      console.log(`[DeepSeek] \u2705 \u5B8C\u6210 | \u5185\u5BB9\u957F\u5EA6=${fullText.length}`);
      if (!fullText || fullText.length < 30) {
        if (retryCount < MAX_RETRIES) {
          console.log(`[DeepSeek] \u{1F504} \u54CD\u5E94\u4E3A\u7A7A\uFF0C\u51C6\u5907\u91CD\u8BD5...`);
          await new Promise((r) => setTimeout(r, 2e3));
          return callDeepSeek(query, userPrompt, retryCount + 1);
        }
        throw new Error("DEEPSEEK_EMPTY_RESPONSE");
      }
      return parseAIResponse(fullText, query);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        if (retryCount < MAX_RETRIES) {
          console.log(`[DeepSeek] \u{1F504} \u8D85\u65F6\u91CD\u8BD5...`);
          return callDeepSeek(query, userPrompt, retryCount + 1);
        }
        throw new Error("DEEPSEEK_TIMEOUT");
      }
      throw err;
    }
  }
  function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization"
      }
    });
  }
  async function handleSearch(request) {
    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5408\u6CD5 JSON" }, 400);
      }
      const query = (body.query ?? "").trim();
      if (!query)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(query));
      const queryHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      console.log(`[Search] \u{1F50D} query="${query.slice(0, 80)}"`);
      const userPrompt = `\u7528\u6237\u7684\u67E5\u8BE2\u95EE\u9898\uFF1A${query}

\u8BF7\u6309\u7CFB\u7EDF\u63D0\u793A\u8BCD\u8981\u6C42\u6DF1\u5EA6\u5206\u6790\u3002\u8F93\u51FA\u7EAF JSON \u683C\u5F0F\uFF0C\u4E0D\u8981 Markdown \u5305\u88F9\u3002`;
      const data = await callDeepSeek(query, userPrompt);
      return json({ jobId: queryHash, status: "done", data });
    } catch (err) {
      console.error("[Search] \u{1F4A5} \u5F02\u5E38:", err?.message || err);
      const errMsg = err?.message || "AI \u5206\u6790\u5931\u8D25";
      const isApiErr = errMsg.includes("DEEPSEEK");
      const hint = isApiErr ? "AI \u5F15\u64CE\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002\u5DF2\u81EA\u52A8\u5207\u6362\u5230\u79BB\u7EBF\u5206\u6790\u6A21\u5F0F\u3002" : "AI \u5206\u6790\u9047\u5230\u5F02\u5E38\uFF0C\u8BF7\u91CD\u8BD5\u6216\u7B80\u5316\u67E5\u8BE2\u5185\u5BB9\u3002";
      return json({
        jobId: "",
        status: "error",
        error: errMsg,
        hint,
        isRecoverable: true
      });
    }
  }
  async function handleSearchStream(request) {
    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5408\u6CD5 JSON" }, 400);
      }
      const query = (body.query ?? "").trim();
      if (!query)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      console.log(`[Stream] \u{1F50D} query="${query.slice(0, 80)}"`);
      const userPrompt = `\u7528\u6237\u7684\u67E5\u8BE2\u95EE\u9898\uFF1A${query}

\u8BF7\u6309\u7CFB\u7EDF\u63D0\u793A\u8BCD\u8981\u6C42\u6DF1\u5EA6\u5206\u6790\u3002\u8F93\u51FA\u7EAF JSON \u683C\u5F0F\uFF0C\u4E0D\u8981 Markdown \u5305\u88F9\u3002`;
      const data = await callDeepSeek(query, userPrompt);
      return json({ v: data });
    } catch (err) {
      console.error("[Stream] \u{1F4A5} \u5F02\u5E38:", err?.message || err);
      return json({
        error: err?.message || "AI \u5206\u6790\u5931\u8D25",
        hint: "AI \u5F15\u64CE\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5"
      }, 500);
    }
  }
  function handleSearchResult(url) {
    const jobId = url.searchParams.get("jobId");
    if (!jobId)
      return json({ error: "\u7F3A\u5C11 jobId \u53C2\u6570" }, 400);
    return json({
      jobId,
      status: "not_found",
      hint: "\u5F53\u524D\u4E3A\u540C\u6B65\u5206\u6790\u6A21\u5F0F\uFF0C\u8BF7\u76F4\u63A5\u8C03\u7528 POST /api/search \u83B7\u53D6\u7ED3\u679C"
    });
  }
  async function handleFollowUp(request) {
    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5408\u6CD5 JSON" }, 400);
      }
      const query = (body.query ?? "").trim();
      if (!query)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      const budget = body.budget ?? 500;
      console.log(`[FollowUp] \u{1F9E0} \u751F\u6210\u8FFD\u95EE query="${query.slice(0, 50)}" budget=${budget}`);
      const followUpPrompt = `\u4F60\u662F\u7535\u5546\u9009\u54C1\u4E13\u5BB6\u3002\u7528\u6237\u6B63\u5728\u63CF\u8FF0\u8D2D\u7269\u9700\u6C42\uFF0C\u4F60\u9700\u8981\u751F\u6210 1~2 \u4E2A\u7CBE\u51C6\u8FFD\u95EE\u6765\u66F4\u597D\u5730\u7406\u89E3\u7528\u6237\u7684\u6DF1\u5C42\u9700\u6C42\u3002

\u7528\u6237\u539F\u59CB\u9700\u6C42\uFF1A${query}
\u7528\u6237\u9884\u7B97\u7EA6\uFF1A\xA5${budget}

\u3010\u751F\u6210\u8FFD\u95EE\u89C4\u5219\u3011\uFF1A
1. \u4F18\u5148\u8865\u9F50\u7528\u6237\u6CA1\u63D0\u5230\u3001\u4F46\u5BF9\u63A8\u8350\u7ED3\u679C\u5F71\u54CD\u5927\u7684\u5173\u952E\u7EF4\u5EA6\uFF08\u5982\u4F7F\u7528\u573A\u666F\u3001\u7279\u6B8A\u504F\u597D\u3001\u7981\u5FCC\u54C1\u724C\u3001\u5BF9\u54C1\u8D28/\u4FBF\u643A/\u989C\u503C\u7B49\u7EF4\u5EA6\u7684\u6743\u91CD\u7B49\uFF09
2. \u5982\u679C\u7528\u6237\u63CF\u8FF0\u5DF2\u7ECF\u975E\u5E38\u5145\u5206\uFF0C\u53EF\u4EE5\u53EA\u751F\u6210 1 \u4E2A\u95EE\u9898\u751A\u81F3 0 \u4E2A
3. \u95EE\u9898\u8981\u9AD8\u5EA6\u8D34\u5408\u8BE5\u54C1\u7C7B\uFF0C\u7981\u6B62\u7528\u300C\u6E38\u620F\u8FD8\u662F\u529E\u516C\u300D\u8FD9\u79CD\u6CDB\u5316\u6A21\u677F\u2014\u2014\u6BD4\u5982\u7528\u6237\u95EE\u5FAE\u5355\uFF0C\u5C31\u522B\u95EE\u6E38\u620F
4. \u6BCF\u4E2A\u95EE\u9898\u63D0\u4F9B 3~5 \u4E2A\u9884\u8BBE\u9009\u9879\uFF0C\u9009\u9879\u8981\u5E26 \u{1F7E2} \u7B80\u6D01 emoji \u63CF\u8FF0\uFF0C\u65B9\u4FBF\u7528\u6237\u70B9\u9009
5. \u95EE\u9898\u7528\u7B80\u6D01\u53E3\u8BED\u5316\u4E2D\u6587\uFF0C\u4E00\u53E5\u8BDD\u8BF4\u6E05

\u3010\u8F93\u51FA\u683C\u5F0F\u3011\u4E25\u683C\u7EAF JSON\uFF08\u65E0 Markdown \u5305\u88F9\uFF09\uFF1A
{
  "questions": [
    {
      "question": "\u8FFD\u95EE\u6587\u672C",
      "options": ["\u9009\u9879A \u{1F7E2}", "\u9009\u9879B \u{1F7E2}", ...]
    }
  ]
}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15e3);
      try {
        const apiResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: DEEPSEEK_MODEL,
            messages: [
              { role: "system", content: "\u4F60\u662F\u7535\u5546\u9009\u54C1\u4E13\u5BB6\uFF0C\u53EA\u8F93\u51FA JSON\uFF0C\u4E0D\u8981 Markdown \u5305\u88F9\u3002" },
              { role: "user", content: followUpPrompt }
            ],
            temperature: 0.4,
            max_tokens: 512,
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!apiResponse.ok) {
          console.error(`[FollowUp] \u274C HTTP ${apiResponse.status}`);
          return json({ questions: [] });
        }
        const jsonResp = await apiResponse.json();
        const text = jsonResp?.choices?.[0]?.message?.content || "";
        let cleaned = text.trim();
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?\s*```\s*$/i, "").trim();
        const fb = cleaned.indexOf("{");
        const lb = cleaned.lastIndexOf("}");
        if (fb !== -1 && lb !== -1 && lb > fb)
          cleaned = cleaned.slice(fb, lb + 1);
        const parsed = JSON.parse(cleaned);
        const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
        console.log(`[FollowUp] \u2705 \u751F\u6210\u4E86 ${questions.length} \u4E2A\u8FFD\u95EE`);
        return json({ questions });
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("[FollowUp] \u{1F4A5} \u5F02\u5E38:", err?.message);
        return json({ questions: [] });
      }
    } catch (err) {
      console.error("[FollowUp] \u{1F4A5} \u8BF7\u6C42\u89E3\u6790\u5931\u8D25:", err?.message);
      return json({ error: "\u8BF7\u6C42\u65E0\u6548" }, 400);
    }
  }
  var STATIC_TRENDING = { keywords: ["\u5439\u98CE\u673A", "\u7A7A\u6C14\u70B8\u9505", "\u7535\u52A8\u7259\u5237", "\u626B\u5730\u673A\u5668\u4EBA", "\u6D17\u5730\u673A", "\u6295\u5F71\u4EEA"] };
  var STATIC_BLACKLIST = {
    items: [
      { id: 1, productName: "\u5FD7\u9AD8\u7A7A\u6C14\u70B8\u9505 99\u5143\u7248", score: 12, fatalFlaw: "\u53D1\u70ED\u7BA1\u529F\u7387\u4E25\u91CD\u865A\u6807\uFF0C\u5B9E\u6D4B\u6BD4\u6807\u79F0\u4F4E 40%", tags: ["\u6EA2\u4EF7\u4E25\u91CD", "\u8D34\u724C\u4EE3\u5DE5"], date: "2026-05" },
      { id: 2, productName: "SKG \u773C\u90E8\u6309\u6469\u4EEA E3", score: 18, fatalFlaw: "\u6240\u8C13AI\u7A74\u4F4D\u6309\u6469\u5C31\u662F\u4E24\u4E2A\u504F\u5FC3\u9A6C\u8FBE\u5728\u9707", tags: ["\u667A\u5546\u7A0E", "\u6982\u5FF5\u7092\u4F5C"], date: "2026-05" },
      { id: 3, productName: "\u5965\u514B\u65AF\u6298\u53E0\u6D17\u8863\u673A", score: 22, fatalFlaw: "\u5BC6\u5C01\u5708\u6781\u6613\u53D1\u9709\uFF0C\u6D17\u4E00\u6B21\u8863\u670D\u673A\u5668\u5148\u81ED\u4E86", tags: ["\u54C1\u63A7\u4E0D\u7A33"], date: "2026-04" },
      { id: 4, productName: "\u8363\u4E8B\u8FBE\u65E0\u53F6\u98CE\u6247", score: 15, fatalFlaw: "\u98CE\u529B\u4E0D\u5230\u666E\u901A\u53F0\u6247\u76841/3\uFF0C\u566A\u97F3\u7FFB\u500D", tags: ["\u53C2\u6570\u865A\u6807"], date: "2026-05" }
    ],
    updatedAt: "2026-05-28"
  };
  var memoryExposes = [];
  var onRequest = async (context) => {
    const { request } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization",
          "access-control-max-age": "86400"
        }
      });
    }
    if (path === "/api/search" && method === "POST")
      return handleSearch(request);
    if (path === "/api/search/stream" && method === "POST")
      return handleSearchStream(request);
    if (path === "/api/search/result" && method === "GET")
      return handleSearchResult(url);
    if (path === "/api/follow-up" && method === "POST")
      return handleFollowUp(request);
    if (path === "/api/health")
      return json({ status: "ok", engine: "DeepSeek", timestamp: Date.now() });
    if (path === "/api/trending")
      return json(STATIC_TRENDING);
    if (path === "/api/blacklist")
      return json(STATIC_BLACKLIST);
    if (path === "/api/expose" && method === "GET") {
      const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20", 10) || 20);
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      const page = memoryExposes.slice(offset, offset + limit);
      return json({ posts: page, hasMore: offset + limit < memoryExposes.length });
    }
    if (path === "/api/expose" && method === "POST") {
      try {
        const body = await request.json();
        memoryExposes.unshift({
          id: Date.now().toString(36),
          productName: body.productName || "",
          pitTitle: body.pitTitle || "",
          description: body.description || "",
          status: "pending",
          voteCount: 0,
          createdAt: Date.now()
        });
        return json({ success: true, message: "\u66DD\u5149\u5DF2\u63D0\u4EA4" });
      } catch {
        return json({ error: "\u63D0\u4EA4\u5931\u8D25" }, 500);
      }
    }
    if (path === "/api/pit-submission" && method === "POST") {
      return json({ success: true, message: "\u63D0\u4EA4\u6210\u529F" });
    }
    if (path === '/api/feedback' && method === 'POST') {
      return json({ success: true, message: "\u53CD\u9988\u5DF2\u8BB0\u5F55" });
    }

    // ======== GET /api/price — 慢慢买实时比价 ========
    if (path === '/api/price' && method === 'GET') {
      var keyword2 = (url.searchParams.get('keyword') || '').trim();
      if (!keyword2) return json({ error: '\u7F3A\u5C11 keyword \u53C2\u6570' }, 400);
      try {
        var ek = encodeURIComponent(keyword2);
        var mmUrl2 = 'https://apapia-history.manmanbuy.com/Chrome/WareSreach.ashx?searchkey=' + ek + '&datatype=0';
        var mmRes = await fetch(mmUrl2, { headers: { 'Accept': '*/*', 'Referer': 'https://www.manmanbuy.com/', 'User-Agent': 'Mozilla/5.0 (compatible; PriceBot/1.0)' }, signal: AbortSignal.timeout(8000) });
        if (mmRes.ok) {
          var txt = await mmRes.text();
          var jstr = txt.replace(/^callbackJSONP\(/, '').replace(/\)\s*$/, '');
          var d = JSON.parse(jstr);
          if (d && d.ok === true && d.data) {
            var pMap = new Map();
            var idm = {'1':'\u4EAC\u4E1C','10':'\u4EAC\u4E1C','8861':'\u4EAC\u4E1C\u5546\u57CE','2':'\u5929\u732B','20':'\u5929\u732B','8862':'\u5929\u732B','3':'\u6DD8\u5B9D','30':'\u6DD8\u5B9D','9':'\u7F51\u6613\u8003\u62C9','90':'\u8003\u62C9\u6D77\u8D2D','13':'\u62FC\u591A\u5914','14':'\u629d\u97F3\u7535\u5546'};
            for (var i = 0; i < (d.data || []).length; i++) {
              var it = d.data[i];
              var pr = parseFloat(it.spprice || it.price || '0');
              if (pr <= 0) continue;
              var nm = (it.siteName || '').trim() || idm[String(it.siteid)] || '\u5176\u4ED6';
              var ex = pMap.get(nm);
              if (!ex || pr < ex) pMap.set(nm, pr);
            }
            var res = [];
            pMap.forEach(function(v, k) { res.push({ platform: k, price: v }); });
            res.sort(function(a, b) { return a.price - b.price; });
            if (res.length > 0)
              return json({ keyword: keyword2, source: 'manmanbuy', items: res, bestPrice: res[0].price, bestPlatform: res[0].platform, updatedAt: new Date().toISOString() });
          }
        }
        return json({ keyword: keyword2, source: 'fallback', items: [], updatedAt: new Date().toISOString(), message: '\u6682\u65E0\u5B9E\u65F6\u6570\u636E' });
      } catch(e2) {
        return json({ keyword: keyword2, source: 'fallback', items: [], error: e2.message, message: '\u67E5\u8BE2\u5931\u8D25' }, 503);
      }
    }

    return json({ error: "Not Found" }, 404);
  };

        pagesFunctionResponse = onRequest;
      })();
          }
        
        };
      

          
        const runMiddleware = typeof executeMiddleware !== 'undefined' ? executeMiddleware : async function() { return null; };
        let middlewareResponseHeaders = null; // 保存中间件设置的响应头
        const middlewareResponse = await runMiddleware({
          request,
          urlInfo: new URL(urlInfo.toString()),
          env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKIDb2sufKPVsYIqLphNpKQp-_ppL665PcQtb-0n6yujbUd-JTcorDZreOO7Gd3xj1Nk","TENCENTCLOUD_SECRETKEY":"FOjKGKmvQPkln2JFezgJRh0EW37gKgxYVEL3Nqf1US8=","TENCENTCLOUD_SESSIONTOKEN":"aSRYdOKKlfC0fbXvPeWS6sMF9r3PwKra85c3aec12df330a1fc8e964123f5deeeHpwsVxVa567gWmDx-sEaJCOpoM9Y5RyDQWmqDWGaUWciXuXMgG-xU29tiaxQSNeSORlqDQbRbQk0uCw4hmtv7iiQO2afCAOG6ixcIqaE3YsXOFBLZaSw76V6Fo0EICpKJHJKjSutIFf7hoUiIArAfdo325ujlzwnY105HlOjjhVjfzmOCP5fPUL0zUz5dX4rNzhqaEj40iWgCZV1p3Br-95BjQNWLfDOIm-wiudaX_IF13YIhugN6cMbzPTKuGx2z1GiolklzkXJebvM1BmtW7PIsfex7O_D48leXPTJTcH2JTakmm3layairmU2RS96zTZU_9-yONQLl4E0kFY6xILuCwdqcfn5jqy4x-cBYyWwzWguXVqBqM9FILxP0UQMM0Me8SkjQUntoABDSClXLmoVSnbKdnwvHU0AIbCahJbUrGDpeaNwGG-uYOfa67zN7eGzIj4Vd1hv58nIsMJd_rhVcLoTRAKOaJ3rt3XHQ-wYv86mNZfyoOIk-FiRh66kpedgkRpvV4Z_P_eOZ_eZiF-tVi-ap1Hb-SNHv7lBTKXuRscde11ILYw_VfRSSaM9WUb-vu9XpCzslUhdZ51hKK3Aj1nyDISI_MmFCE56MdDpsuKFV_0A5cxI9V8sqsCGmXRpccGFRiGIK5UTEsyZ1XuIaO-hKrmQdCDjPXWMJssQmcEzNC_fFburwtdAsw8yqYyZ0sy3Fi17dYjcPCbXWbUaVBUSYvo1duTAczaKI9ANq1zNvY0w8V78SlF2gDSCz3PGYLQGzui2kDo05pW6joyaK7lDdletDsocyCrPqQBHTJH8xpFGdSbCmSNiUi0LwbVFc3jFegEZCZ8YGuBhyUucKBWxaO0XfS8qRocBKfZ8E7KotheiEc0VYcwwKDZQClac1tAEs11Xm6KBT9HK3VyAxjVmn3E5giJd18ESEVaZJ9cK20X5CdXwLFaha9aX4sl3Mbar64mI5XKbjhUKyTRG8IPxctytrTiPZJmN6yKwJLKd5vwymn1ITFFH-x7i0ud9vfEdz5jdx5aDVaeQEOebssaFtl_R0NqTXUEDfH6GUZvoZRRT7HuU6PysyUGG8ya8vW0k2rWfSZgOjYXQlZh1hT3b29KTLVBibfqlMtI4ZMe9mejxnHcsvlYh7yUEJjGrY1ivUSGOjdqxLmDlH4moFQUN2j6OGh5fWgsIX6mOrPLxyMheWYAIWHrSDypaWwdxmLTpRjJ_NoBUlKJ-lgzAYxZ8LadmJSoPZbDwusVv1mL7lFHK4yOY09AXwaUBgECCvw-1UXoU0VHdaTzc0XqBLtCpmdVUU76K3YNaI_LLCa6RWKrMKDF91R1D7WIbXiSGtDV4u5_0SxKC2VfoWHvrwKYqHi3DlZTy_LPOV_7KUNs5kWCKvAwIFTcq_wMAyNU-t_aWWb3IRAtW7MQunId0ays6qXux86dF1iTKj5TnpaXsF2AxfnUiQzLUw8pKFzFzsSYzOcJHWodgdFdl3YA6NSd3ghIpGOVH0wPLXeRyaX2JpyfU_tzW2jgCEsiMmV3d63eZSUwqLbFEWW4lUVys7awUfxNizN_Ank_UVmiaGQa9CxcOJ-o1kbupXOa3QNSqbehlKRE9mGylhCKoIw4x9YDvhdWsTEzTyQuJaFZvh9P_B8PsFO_T92Bc62KeVJaMPHRHvLN9GFVAIc8KZmlx7EjVZZwPJemTHt-5nP1FNHZHt9vJhVaIysPYHm-f4MuyBcwfBo16XUOv277SiTXCT2FZM54n1fBWY5A-s0HXR2bl6W8suFNxiNNONKAucy2FwR9BFdnL8yy2Z2TS6KCrvSu6HH9VQZAGsZzgcw7Wnyyy4Kf57vCkWES_mQEJZ_V42GfTfTXeCPt60eCwv5jW5L3mMQOKuvl-NbvnKkbIf_TYtVu1x_9WUznirt26bfTS4RVlUyZ876HwXDqU7MDKQ8y-PJpO5j_qi1n1Su5MEfOqMdpNR68sd0NKuwSN-HPWnr7bYXOc623HlGUlXxuPT8417lwcReafoLrcBC-63jxu1vjecvG0qe0cHG1QKrdl9eP3GWGNhuCsUPDqMx3wzYdEbWJ-2SYUT7TE6cysRmZEKLuaiI0JM_x64dqhnDyXXTsfDrnsQwJ3AKUahVJZ3WSDIm1A9OZ0qY_MgHzK0fbzTcEJOZZMCfzNjpdHxLambsCDVd39k75tQa_Ug0PnZvkU7o6WJM1dSd_ma1bPFttO7oJcQzJDAwJZ8MMSz86Vg3lBj4n4k8hKI1wHSY3dRO4K4-A2-Hl6T6suMLlS6YQ12q-DmI4vDVygazj_jekoBEEp6q_DJcC0oMLhqAiEP4bQ1oqpgSXTea6uwNa-PeqcP5rbMCCqIvMzWP8JF0VZTzxp5N2Q43jyy0z4Lg","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"},
          waitUntil,
          hookCtx
        });

        if (middlewareResponse) {
          const headers = middlewareResponse.headers;
          const hasNext = headers && headers.get('x-middleware-next') === '1';
          const rewriteTarget = headers && headers.get('x-middleware-rewrite');
          const requestHeadersOverride = headers && headers.get('x-middleware-request-headers');
          // Next.js 使用 x-middleware-override-headers 传递需要修改的请求头列表
          const overrideHeadersList = headers && headers.get('x-middleware-override-headers');

          if (rewriteTarget) {
            try {
              const rewrittenUrl = rewriteTarget.startsWith('http://') || rewriteTarget.startsWith('https://')
                ? rewriteTarget
                : new URL(rewriteTarget, urlInfo.origin).toString();
              request = recreateRequest(request, { url: rewrittenUrl });
              urlInfo = new URL(rewrittenUrl);
              normalizePathname();
            } catch (rewriteError) {
              console.error('Middleware rewrite error:', rewriteError);
            }
          }

          // 处理 Next.js 的 x-middleware-override-headers 机制
          if (overrideHeadersList) {
            try {
              const overrideKeys = overrideHeadersList.split(',').map(k => k.trim());
              for (const key of overrideKeys) {
                const newValue = headers.get('x-middleware-request-' + key);
                if (newValue !== null) {
                  request.headers.set(key, newValue);
                } else {
                  request.headers.delete(key);
                }
              }
            } catch (overrideError) {
              console.error('Middleware override headers error:', overrideError);
            }
          }
          // 处理旧的 x-middleware-request-headers 机制（兼容）
          else if (requestHeadersOverride) {
            try {
              const decoded = decodeURIComponent(requestHeadersOverride);
              const headerPatch = JSON.parse(decoded);
              Object.keys(headerPatch).forEach((key) => {
                const value = headerPatch[key];
                if (value === null || typeof value === 'undefined') {
                  request.headers.delete(key);
                } else {
                  request.headers.set(key, value);
                }
              });
            } catch (requestPatchError) {
              console.error('Middleware request header override error:', requestPatchError);
            }
          }

          if (!hasNext && !rewriteTarget) {
            return middlewareResponse;
          }

          if (hasNext) {
            middlewareResponseHeaders = new Headers();
            const skipHeaders = new Set([
              'x-middleware-next',
              'x-middleware-rewrite',
              'x-middleware-request-headers',
              'x-middleware-override-headers',
              'x-middleware-set-cookie',
              'date',
              'connection',
              'content-length',
              'content-encoding', // 避免中间件传递的压缩头覆盖到最终响应，破坏流式响应
              'transfer-encoding',
              'set-cookie', // Set-Cookie 需要特殊处理，避免重复
            ]);
            headers.forEach((value, key) => {
              const lowerKey = key.toLowerCase();
              // 过滤内部使用的 header：skipHeaders 中的 + x-middleware-request-* 前缀的请求头修改标记
              if (!skipHeaders.has(lowerKey) && !lowerKey.startsWith('x-middleware-request-')) {
                middlewareResponseHeaders.set(key, value);
              }
            });
            // 特殊处理 Set-Cookie，可能有多个，使用 getSetCookie 获取完整的 cookie 值
            const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
            setCookies.forEach(cookie => {
              middlewareResponseHeaders.append('Set-Cookie', cookie);
            });
          }
        }
      

          // 走到这里说明：
          // 1. 没有中间件响应（middlewareResponse 为 null/undefined）
          // 2. 或者中间件返回了 next
          // 需要判断是否命中边缘函数

          runEdgeFunctions();

          //没有命中边缘函数，执行回源
          if (!matchedFunc) {
            const originResponse = await fetch(request);

            // 如果中间件设置了响应头，合并到回源响应中
            if (middlewareResponseHeaders) {
              const mergedHeaders = new Headers(originResponse.headers);
              // 删除可能导致问题的编码相关头
              mergedHeaders.delete('content-encoding');
              mergedHeaders.delete('content-length');
              middlewareResponseHeaders.forEach((value, key) => {
                if (key.toLowerCase() === 'set-cookie') {
                  mergedHeaders.append(key, value);
                } else {
                  mergedHeaders.set(key, value);
                }
              });
              return new Response(originResponse.body, {
                status: originResponse.status,
                statusText: originResponse.statusText,
                headers: mergedHeaders,
              });
            }

            return originResponse;
          }

          // 命中了边缘函数，继续执行边缘函数逻辑

          const params = {};
          if (routeParams.id) {
            if (routeParams.mode === 1) {
              const value = urlInfo.pathname.match(routeParams.left);
              for (let i = 1; i < value.length; i++) {
                params[routeParams.id[i - 1]] = value[i];
              }
            } else {
              const value = urlInfo.pathname.replace(routeParams.left, '');
              const splitedValue = value.split('/');
              if (splitedValue.length === 1) {
                params[routeParams.id] = splitedValue[0];
              } else {
                params[routeParams.id] = splitedValue;
              }
            }

          }
          const edgeFunctionResponse = await pagesFunctionResponse({request, params, env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKIDb2sufKPVsYIqLphNpKQp-_ppL665PcQtb-0n6yujbUd-JTcorDZreOO7Gd3xj1Nk","TENCENTCLOUD_SECRETKEY":"FOjKGKmvQPkln2JFezgJRh0EW37gKgxYVEL3Nqf1US8=","TENCENTCLOUD_SESSIONTOKEN":"aSRYdOKKlfC0fbXvPeWS6sMF9r3PwKra85c3aec12df330a1fc8e964123f5deeeHpwsVxVa567gWmDx-sEaJCOpoM9Y5RyDQWmqDWGaUWciXuXMgG-xU29tiaxQSNeSORlqDQbRbQk0uCw4hmtv7iiQO2afCAOG6ixcIqaE3YsXOFBLZaSw76V6Fo0EICpKJHJKjSutIFf7hoUiIArAfdo325ujlzwnY105HlOjjhVjfzmOCP5fPUL0zUz5dX4rNzhqaEj40iWgCZV1p3Br-95BjQNWLfDOIm-wiudaX_IF13YIhugN6cMbzPTKuGx2z1GiolklzkXJebvM1BmtW7PIsfex7O_D48leXPTJTcH2JTakmm3layairmU2RS96zTZU_9-yONQLl4E0kFY6xILuCwdqcfn5jqy4x-cBYyWwzWguXVqBqM9FILxP0UQMM0Me8SkjQUntoABDSClXLmoVSnbKdnwvHU0AIbCahJbUrGDpeaNwGG-uYOfa67zN7eGzIj4Vd1hv58nIsMJd_rhVcLoTRAKOaJ3rt3XHQ-wYv86mNZfyoOIk-FiRh66kpedgkRpvV4Z_P_eOZ_eZiF-tVi-ap1Hb-SNHv7lBTKXuRscde11ILYw_VfRSSaM9WUb-vu9XpCzslUhdZ51hKK3Aj1nyDISI_MmFCE56MdDpsuKFV_0A5cxI9V8sqsCGmXRpccGFRiGIK5UTEsyZ1XuIaO-hKrmQdCDjPXWMJssQmcEzNC_fFburwtdAsw8yqYyZ0sy3Fi17dYjcPCbXWbUaVBUSYvo1duTAczaKI9ANq1zNvY0w8V78SlF2gDSCz3PGYLQGzui2kDo05pW6joyaK7lDdletDsocyCrPqQBHTJH8xpFGdSbCmSNiUi0LwbVFc3jFegEZCZ8YGuBhyUucKBWxaO0XfS8qRocBKfZ8E7KotheiEc0VYcwwKDZQClac1tAEs11Xm6KBT9HK3VyAxjVmn3E5giJd18ESEVaZJ9cK20X5CdXwLFaha9aX4sl3Mbar64mI5XKbjhUKyTRG8IPxctytrTiPZJmN6yKwJLKd5vwymn1ITFFH-x7i0ud9vfEdz5jdx5aDVaeQEOebssaFtl_R0NqTXUEDfH6GUZvoZRRT7HuU6PysyUGG8ya8vW0k2rWfSZgOjYXQlZh1hT3b29KTLVBibfqlMtI4ZMe9mejxnHcsvlYh7yUEJjGrY1ivUSGOjdqxLmDlH4moFQUN2j6OGh5fWgsIX6mOrPLxyMheWYAIWHrSDypaWwdxmLTpRjJ_NoBUlKJ-lgzAYxZ8LadmJSoPZbDwusVv1mL7lFHK4yOY09AXwaUBgECCvw-1UXoU0VHdaTzc0XqBLtCpmdVUU76K3YNaI_LLCa6RWKrMKDF91R1D7WIbXiSGtDV4u5_0SxKC2VfoWHvrwKYqHi3DlZTy_LPOV_7KUNs5kWCKvAwIFTcq_wMAyNU-t_aWWb3IRAtW7MQunId0ays6qXux86dF1iTKj5TnpaXsF2AxfnUiQzLUw8pKFzFzsSYzOcJHWodgdFdl3YA6NSd3ghIpGOVH0wPLXeRyaX2JpyfU_tzW2jgCEsiMmV3d63eZSUwqLbFEWW4lUVys7awUfxNizN_Ank_UVmiaGQa9CxcOJ-o1kbupXOa3QNSqbehlKRE9mGylhCKoIw4x9YDvhdWsTEzTyQuJaFZvh9P_B8PsFO_T92Bc62KeVJaMPHRHvLN9GFVAIc8KZmlx7EjVZZwPJemTHt-5nP1FNHZHt9vJhVaIysPYHm-f4MuyBcwfBo16XUOv277SiTXCT2FZM54n1fBWY5A-s0HXR2bl6W8suFNxiNNONKAucy2FwR9BFdnL8yy2Z2TS6KCrvSu6HH9VQZAGsZzgcw7Wnyyy4Kf57vCkWES_mQEJZ_V42GfTfTXeCPt60eCwv5jW5L3mMQOKuvl-NbvnKkbIf_TYtVu1x_9WUznirt26bfTS4RVlUyZ876HwXDqU7MDKQ8y-PJpO5j_qi1n1Su5MEfOqMdpNR68sd0NKuwSN-HPWnr7bYXOc623HlGUlXxuPT8417lwcReafoLrcBC-63jxu1vjecvG0qe0cHG1QKrdl9eP3GWGNhuCsUPDqMx3wzYdEbWJ-2SYUT7TE6cysRmZEKLuaiI0JM_x64dqhnDyXXTsfDrnsQwJ3AKUahVJZ3WSDIm1A9OZ0qY_MgHzK0fbzTcEJOZZMCfzNjpdHxLambsCDVd39k75tQa_Ug0PnZvkU7o6WJM1dSd_ma1bPFttO7oJcQzJDAwJZ8MMSz86Vg3lBj4n4k8hKI1wHSY3dRO4K4-A2-Hl6T6suMLlS6YQ12q-DmI4vDVygazj_jekoBEEp6q_DJcC0oMLhqAiEP4bQ1oqpgSXTea6uwNa-PeqcP5rbMCCqIvMzWP8JF0VZTzxp5N2Q43jyy0z4Lg","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"}, waitUntil, eo });

          // 如果中间件设置了响应头，合并到边缘函数响应中
          if (middlewareResponseHeaders && edgeFunctionResponse) {
            const mergedHeaders = new Headers(edgeFunctionResponse.headers);
            // 删除可能导致问题的编码相关头
            mergedHeaders.delete('content-encoding');
            mergedHeaders.delete('content-length');
            middlewareResponseHeaders.forEach((value, key) => {
              if (key.toLowerCase() === 'set-cookie') {
                mergedHeaders.append(key, value);
              } else {
                mergedHeaders.set(key, value);
              }
            });
            return new Response(edgeFunctionResponse.body, {
              status: edgeFunctionResponse.status,
              statusText: edgeFunctionResponse.statusText,
              headers: mergedHeaders,
            });
          }

          return edgeFunctionResponse;
        })({request: ev.request, params: {}, env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKIDb2sufKPVsYIqLphNpKQp-_ppL665PcQtb-0n6yujbUd-JTcorDZreOO7Gd3xj1Nk","TENCENTCLOUD_SECRETKEY":"FOjKGKmvQPkln2JFezgJRh0EW37gKgxYVEL3Nqf1US8=","TENCENTCLOUD_SESSIONTOKEN":"aSRYdOKKlfC0fbXvPeWS6sMF9r3PwKra85c3aec12df330a1fc8e964123f5deeeHpwsVxVa567gWmDx-sEaJCOpoM9Y5RyDQWmqDWGaUWciXuXMgG-xU29tiaxQSNeSORlqDQbRbQk0uCw4hmtv7iiQO2afCAOG6ixcIqaE3YsXOFBLZaSw76V6Fo0EICpKJHJKjSutIFf7hoUiIArAfdo325ujlzwnY105HlOjjhVjfzmOCP5fPUL0zUz5dX4rNzhqaEj40iWgCZV1p3Br-95BjQNWLfDOIm-wiudaX_IF13YIhugN6cMbzPTKuGx2z1GiolklzkXJebvM1BmtW7PIsfex7O_D48leXPTJTcH2JTakmm3layairmU2RS96zTZU_9-yONQLl4E0kFY6xILuCwdqcfn5jqy4x-cBYyWwzWguXVqBqM9FILxP0UQMM0Me8SkjQUntoABDSClXLmoVSnbKdnwvHU0AIbCahJbUrGDpeaNwGG-uYOfa67zN7eGzIj4Vd1hv58nIsMJd_rhVcLoTRAKOaJ3rt3XHQ-wYv86mNZfyoOIk-FiRh66kpedgkRpvV4Z_P_eOZ_eZiF-tVi-ap1Hb-SNHv7lBTKXuRscde11ILYw_VfRSSaM9WUb-vu9XpCzslUhdZ51hKK3Aj1nyDISI_MmFCE56MdDpsuKFV_0A5cxI9V8sqsCGmXRpccGFRiGIK5UTEsyZ1XuIaO-hKrmQdCDjPXWMJssQmcEzNC_fFburwtdAsw8yqYyZ0sy3Fi17dYjcPCbXWbUaVBUSYvo1duTAczaKI9ANq1zNvY0w8V78SlF2gDSCz3PGYLQGzui2kDo05pW6joyaK7lDdletDsocyCrPqQBHTJH8xpFGdSbCmSNiUi0LwbVFc3jFegEZCZ8YGuBhyUucKBWxaO0XfS8qRocBKfZ8E7KotheiEc0VYcwwKDZQClac1tAEs11Xm6KBT9HK3VyAxjVmn3E5giJd18ESEVaZJ9cK20X5CdXwLFaha9aX4sl3Mbar64mI5XKbjhUKyTRG8IPxctytrTiPZJmN6yKwJLKd5vwymn1ITFFH-x7i0ud9vfEdz5jdx5aDVaeQEOebssaFtl_R0NqTXUEDfH6GUZvoZRRT7HuU6PysyUGG8ya8vW0k2rWfSZgOjYXQlZh1hT3b29KTLVBibfqlMtI4ZMe9mejxnHcsvlYh7yUEJjGrY1ivUSGOjdqxLmDlH4moFQUN2j6OGh5fWgsIX6mOrPLxyMheWYAIWHrSDypaWwdxmLTpRjJ_NoBUlKJ-lgzAYxZ8LadmJSoPZbDwusVv1mL7lFHK4yOY09AXwaUBgECCvw-1UXoU0VHdaTzc0XqBLtCpmdVUU76K3YNaI_LLCa6RWKrMKDF91R1D7WIbXiSGtDV4u5_0SxKC2VfoWHvrwKYqHi3DlZTy_LPOV_7KUNs5kWCKvAwIFTcq_wMAyNU-t_aWWb3IRAtW7MQunId0ays6qXux86dF1iTKj5TnpaXsF2AxfnUiQzLUw8pKFzFzsSYzOcJHWodgdFdl3YA6NSd3ghIpGOVH0wPLXeRyaX2JpyfU_tzW2jgCEsiMmV3d63eZSUwqLbFEWW4lUVys7awUfxNizN_Ank_UVmiaGQa9CxcOJ-o1kbupXOa3QNSqbehlKRE9mGylhCKoIw4x9YDvhdWsTEzTyQuJaFZvh9P_B8PsFO_T92Bc62KeVJaMPHRHvLN9GFVAIc8KZmlx7EjVZZwPJemTHt-5nP1FNHZHt9vJhVaIysPYHm-f4MuyBcwfBo16XUOv277SiTXCT2FZM54n1fBWY5A-s0HXR2bl6W8suFNxiNNONKAucy2FwR9BFdnL8yy2Z2TS6KCrvSu6HH9VQZAGsZzgcw7Wnyyy4Kf57vCkWES_mQEJZ_V42GfTfTXeCPt60eCwv5jW5L3mMQOKuvl-NbvnKkbIf_TYtVu1x_9WUznirt26bfTS4RVlUyZ876HwXDqU7MDKQ8y-PJpO5j_qi1n1Su5MEfOqMdpNR68sd0NKuwSN-HPWnr7bYXOc623HlGUlXxuPT8417lwcReafoLrcBC-63jxu1vjecvG0qe0cHG1QKrdl9eP3GWGNhuCsUPDqMx3wzYdEbWJ-2SYUT7TE6cysRmZEKLuaiI0JM_x64dqhnDyXXTsfDrnsQwJ3AKUahVJZ3WSDIm1A9OZ0qY_MgHzK0fbzTcEJOZZMCfzNjpdHxLambsCDVd39k75tQa_Ug0PnZvkU7o6WJM1dSd_ma1bPFttO7oJcQzJDAwJZ8MMSz86Vg3lBj4n4k8hKI1wHSY3dRO4K4-A2-Hl6T6suMLlS6YQ12q-DmI4vDVygazj_jekoBEEp6q_DJcC0oMLhqAiEP4bQ1oqpgSXTea6uwNa-PeqcP5rbMCCqIvMzWP8JF0VZTzxp5N2Q43jyy0z4Lg","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"}, waitUntil: ev.waitUntil.bind(ev) });
        // ↑ 用户原始代码结束
      }

      addEventListener('fetch', (event, hookCtx) => {
        const res = usercode(event, hookCtx);
        event.respondWith(res);
      });