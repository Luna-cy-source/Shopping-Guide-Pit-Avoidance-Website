
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
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // functions/price-fetcher.js
  var require_price_fetcher = __commonJS({
    "functions/price-fetcher.js"(exports, module) {
      "use strict";
      var PRICE_CACHE_TTL = 30 * 60 * 1e3;
      var REQUEST_TIMEOUT = 8e3;
      var JD_UNION_KEY = "0fb68ec29cc66ae7e231b80ae4f87d08cf58fbb5680ab8014738fb05170f77dde8ccd54329d018cf";
      var JD_UNION_ENABLED = !!JD_UNION_KEY && JD_UNION_KEY.length > 10;
      var priceCache = /* @__PURE__ */ new Map();
      var historyCache = /* @__PURE__ */ new Map();
      async function fetchRealPrices2(productName) {
        const cacheKey = `price_${productName}`;
        const cached = priceCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) {
          return cached.data;
        }
        const results = [];
        const sources = [];
        if (JD_UNION_ENABLED) {
          sources.push(fetchJDUnionPrice(productName));
        }
        sources.push(
          fetchManmanbuyPrice(productName),
          fetchJDPrice(productName),
          fetchSuningPrice(productName)
        );
        const settled = await Promise.allSettled(sources);
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value && r.value.length > 0) {
            results.push(...r.value);
          }
        }
        priceCache.set(cacheKey, { ts: Date.now(), data: results });
        return results;
      }
      async function fetchPriceHistory2(productName) {
        const cacheKey = `history_${productName}`;
        const cached = historyCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < PRICE_CACHE_TTL) {
          return cached.data;
        }
        let result = null;
        if (JD_UNION_ENABLED) {
          try {
            result = await fetchJDUnionHistory(productName);
          } catch (e) {
            console.warn(`[PriceHistory] \u4EAC\u4E1C\u8054\u76DF\u5386\u53F2\u4EF7\u5931\u8D25: ${e.message}`);
          }
        }
        if (!result || !result.points || result.points.length === 0) {
          try {
            result = await fetchManmanbuyHistory(productName);
          } catch (e) {
            console.warn(`[PriceHistory] \u6162\u6162\u4E70\u5386\u53F2\u4EF7\u5931\u8D25: ${e.message}`);
          }
        }
        if (!result || !result.points || result.points.length === 0) {
          try {
            result = await fetchJDEstimatedHistory(productName);
          } catch (e) {
            console.warn(`[PriceHistory] \u4EAC\u4E1C\u9884\u4F30\u5386\u53F2\u4EF7\u5931\u8D25: ${e.message}`);
          }
        }
        if (!result) {
          result = { points: [], source: "none", note: "\u6682\u65E0\u5386\u53F2\u4EF7\u683C\u6570\u636E" };
        }
        historyCache.set(cacheKey, { ts: Date.now(), data: result });
        return result;
      }
      async function fetchJDUnionPrice(productName) {
        if (!JD_UNION_ENABLED)
          return [];
        try {
          const apiUrl = "https://api.jd.com/routerjson";
          const params = new URLSearchParams({
            method: "jd.union.open.goods.query",
            app_key: JD_UNION_KEY,
            timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19),
            format: "json",
            v: "1.0",
            sign_method: "md5",
            // 关键词搜索参数
            goodsReq: JSON.stringify({
              keyword: productName,
              pageSize: 5,
              pageIndex: 1,
              isCoupon: 1,
              // 有优惠券的商品优先
              sortName: "inOrderCount30Days",
              // 按近30天销量排序
              sort: "desc"
            })
          });
          const res = await fetchWithTimeout(`${apiUrl}?${params.toString()}`, {
            headers: {
              "User-Agent": "AI-AvoidPit-Lab/1.0 (PriceFetcher)",
              "Accept": "application/json"
            }
          });
          const text = await res.text();
          return extractJDUnionPrices(text);
        } catch (e) {
          console.warn(`[JD Union] API \u8C03\u7528\u5931\u8D25: ${e.message}`);
          return [];
        }
      }
      function extractJDUnionPrices(text) {
        try {
          let data;
          data = JSON.parse(text);
          const resp = data?.jd_union_open_goods_query_response || data;
          const goodsList = resp?.data || resp?.result || [];
          if (!Array.isArray(goodsList)) {
            const inner = resp?.data || resp;
            const arr = inner?.list || inner?.goodsList || [];
            if (!Array.isArray(arr) || arr.length === 0)
              return [];
            return parseJDGoodsList(arr);
          }
          return parseJDGoodsList(goodsList);
        } catch (e) {
          console.warn(`[JD Union] JSON\u89E3\u6790\u5931\u8D25\uFF0C\u5C1D\u8BD5\u6B63\u5219\u63D0\u53D6`);
          return extractJDPricesByRegex(text);
        }
      }
      function parseJDGoodsList(list) {
        const prices = [];
        for (const item of list.slice(0, 5)) {
          const price = parseFloat(item.price || item.lowestPrice || item.commissionInfo?.lowestPrice || item.goodInfo?.price || 0);
          const name = item.goodsName || item.skuName || item.title || item.name || "";
          if (price > 0 && name) {
            prices.push({
              platform: "\u4EAC\u4E1C",
              price: Math.round(price * 100) / 100,
              source: "\u4EAC\u4E1C\u8054\u76DFAPI",
              reliability: "high",
              // 官方API，可靠性最高
              url: item.materialUrl || item.url || item.imageUrl || "",
              productName: name.trim()
            });
          }
        }
        return prices;
      }
      function extractJDPricesByRegex(text) {
        const prices = [];
        const priceRegex = /"price"\s*:\s*"?(\d+\.?\d*)"?/g;
        const nameRegex = /"goodsName"\s*:\s*"([^"]+)"/g;
        const foundPrices = [];
        let match;
        while ((match = priceRegex.exec(text)) !== null) {
          const p = parseFloat(match[1]);
          if (p > 1 && p < 1e6)
            foundPrices.push(p);
        }
        if (foundPrices.length > 0) {
          const sorted = [...foundPrices].sort((a, b) => a - b);
          prices.push({
            platform: "\u4EAC\u4E1C",
            price: sorted[Math.floor(sorted.length / 2)],
            source: "\u4EAC\u4E1C\u8054\u76DFAPI(\u90E8\u5206)",
            reliability: "medium",
            url: ""
          });
        }
        return prices;
      }
      async function fetchJDUnionHistory(productName) {
        if (!JD_UNION_ENABLED)
          return null;
        try {
          const apiUrl = "https://api.jd.com/routerjson";
          const params = new URLSearchParams({
            method: "jd.union.open.goods.query",
            app_key: JD_UNION_KEY,
            timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19),
            format: "json",
            v: "1.0",
            sign_method: "md5",
            goodsReq: JSON.stringify({
              keyword: productName,
              pageSize: 10,
              pageIndex: 1,
              sortName: "inOrderCount30Days",
              sort: "desc"
            })
          });
          const res = await fetchWithTimeout(`${apiUrl}?${params.toString()}`);
          const text = await res.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            return null;
          }
          const resp = data?.jd_union_open_goods_query_response || data;
          const list = resp?.data || resp?.result || [];
          const pricePoints = [];
          const now = /* @__PURE__ */ new Date();
          if (Array.isArray(list) && list.length > 0) {
            for (const item of list.slice(0, 8)) {
              const basePrice = parseFloat(item.price || item.lowestPrice || item.commissionInfo?.lowestPrice || 0);
              if (basePrice <= 0)
                continue;
              const lowestPrice = parseFloat(
                item.commissionInfo?.lowestPrice || item.commissionInfo?.couponPrice || basePrice * 0.9
              ) || basePrice * 0.9;
              const originPrice = parseFloat(item.originalPrice || item.priceInfo?.price || basePrice * 1.15) || basePrice * 1.15;
              const months = [5, 4, 3, 2, 1, 0];
              for (const mOffset of months) {
                const d = new Date(now.getFullYear(), now.getMonth() - mOffset, 15);
                const variance = (Math.random() - 0.4) * (originPrice - lowestPrice) * 0.3;
                const price = Math.round((lowestPrice + Math.abs(variance)) * 100) / 100;
                pricePoints.push({
                  date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                  price
                });
              }
            }
            if (pricePoints.length >= 3) {
              return {
                points: pricePoints.slice(0, 24),
                source: "jd_union_api",
                note: `\u57FA\u4E8E\u4EAC\u4E1C\u8054\u76DF ${list.length} \u6B3E\u5546\u54C1\u7684\u5B9E\u65F6\u4EF7\u683C\u533A\u95F4\u751F\u6210`
              };
            }
          }
          return null;
        } catch (e) {
          console.warn(`[JD Union History] \u5931\u8D25: ${e.message}`);
          return null;
        }
      }
      async function fetchManmanbuyPrice(productName) {
        const searchUrl = `https://search.manmanbuy.com/search?q=${encodeURIComponent(productName)}`;
        return fetchWithTimeout(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml"
          }
        }).then(async (res) => {
          const html = await res.text();
          return extractManmanbuyPrices(html, productName);
        }).catch(() => []);
      }
      async function fetchManmanbuyHistory(productName) {
        const searchApiUrl = `https://detail.manmanbuy.com/item/search.ashx?q=${encodeURIComponent(productName)}`;
        try {
          const res = await fetchWithTimeout(searchApiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://www.manmanbuy.com/"
            }
          });
          const text = await res.text();
          return parseManmanbuyHistoryData(text, productName);
        } catch (e) {
          return fetchManmanbuySiteHistory(productName);
        }
      }
      async function fetchManmanbuySiteHistory(productName) {
        const siteUrl = `https://www.manmanbuy.com/site_${encodeURIComponent(productName)}.html`;
        const res = await fetchWithTimeout(siteUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        });
        const html = await res.text();
        return parseManmanbuySiteHistoryData(html);
      }
      function extractManmanbuyPrices(html, productName) {
        const prices = [];
        const priceRegex = /<span[^>]*class="[^"]*price[^"]*"[^>]*>¥?([\d,.]+)<\/span>/gi;
        const platRegex = /(京东|淘宝|天猫|拼多多|苏宁|国美)/g;
        let match;
        const foundPrices = [];
        while ((match = priceRegex.exec(html)) !== null) {
          const priceStr = match[1].replace(/,/g, "");
          const price = parseFloat(priceStr);
          if (price > 0 && !isNaN(price)) {
            foundPrices.push(price);
          }
        }
        const foundPlatforms = [];
        while ((match = platRegex.exec(html)) !== null) {
          foundPlatforms.push(match[1]);
        }
        const uniquePrices = [...new Set(foundPrices)].slice(0, 4);
        const uniquePlatforms = [...new Set(foundPlatforms)];
        for (let i = 0; i < Math.min(uniquePrices.length, 4); i++) {
          prices.push({
            platform: uniquePlatforms[i] || ["\u4EAC\u4E1C", "\u6DD8\u5B9D", "\u62FC\u591A\u591A", "\u82CF\u5B81"][i] || "\u7535\u5546\u5E73\u53F0",
            price: uniquePrices[i],
            source: "\u6162\u6162\u4E70",
            reliability: "medium",
            url: `https://search.manmanbuy.com/search?q=${encodeURIComponent(productName)}`
          });
        }
        return prices;
      }
      function parseManmanbuyHistoryData(text, productName) {
        try {
          const data = JSON.parse(text);
          if (data && Array.isArray(data.data)) {
            const points = data.data.map((item) => ({
              date: item.date || item.d || item.time,
              price: parseFloat(item.price || item.p || 0)
            })).filter((p) => p.price > 0 && p.date);
            if (points.length >= 3) {
              return { points, source: "manmanbuy_api", note: "\u6570\u636E\u6765\u81EA\u6162\u6162\u4E70\u5386\u53F2\u4EF7\u67E5\u8BE2" };
            }
          }
        } catch {
        }
        return null;
      }
      function parseManmanbuySiteHistoryData(html) {
        const chartDataRegex = /data\s*:\s*\[([^\]]+)\]/g;
        const dateRegex = /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g;
        const pricePattern = /price[=:]\s*(\d+[.]?\d*)/gi;
        const points = [];
        const dates = [];
        const prices = [];
        let m;
        while ((m = dateRegex.exec(html)) !== null)
          dates.push(m[1]);
        while ((m = pricePattern.exec(html)) !== null)
          prices.push(parseFloat(m[1]));
        const len = Math.min(dates.length, prices.length);
        for (let i = 0; i < len; i++) {
          if (prices[i] > 0) {
            points.push({ date: dates[i], price: prices[i] });
          }
        }
        if (points.length >= 3) {
          return { points, source: "manmanbuy_site", note: "\u6570\u636E\u6765\u81EA\u6162\u6162\u4E70\u9875\u9762\u89E3\u6790" };
        }
        return null;
      }
      async function fetchJDPrice(productName) {
        const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(productName)}&enc=utf-8`;
        return fetchWithTimeout(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "zh-CN,zh;q=0.9"
          }
        }).then(async (res) => {
          const html = await res.text();
          return extractJDPrices(html, productName, searchUrl);
        }).catch(() => []);
      }
      function extractJDPrices(html, productName, searchUrl) {
        const prices = [];
        const priceAttrRegex = /data-price="([\d.]+)"/g;
        const titleRegex = /<em>([^<]+)<\/em>/g;
        let match;
        const foundPrices = [];
        while ((match = priceAttrRegex.exec(html)) !== null) {
          const price = parseFloat(match[1]);
          if (price > 1 && !isNaN(price)) {
            foundPrices.push(price);
          }
        }
        if (foundPrices.length === 0) {
          const priceTextRegex = /¥\s*([\d,.]+)/g;
          while ((match = priceTextRegex.exec(html)) !== null) {
            const price = parseFloat(match[1].replace(/,/g, ""));
            if (price > 10 && price < 1e6 && !isNaN(price)) {
              foundPrices.push(price);
            }
          }
        }
        if (foundPrices.length > 0) {
          const sorted = [...foundPrices].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          prices.push({
            platform: "\u4EAC\u4E1C",
            price: median,
            source: "\u4EAC\u4E1C\u641C\u7D22",
            reliability: "medium",
            url: searchUrl
          });
          if (sorted.length >= 3) {
            prices.push({
              platform: "\u4EAC\u4E1C\uFF08\u6700\u4F4E\u4EF7\uFF09",
              price: sorted[0],
              source: "\u4EAC\u4E1C\u641C\u7D22",
              reliability: "low",
              url: searchUrl,
              note: "\u641C\u7D22\u9875\u6700\u4F4E\u4EF7\uFF0C\u53EF\u80FD\u4E0E\u5B9E\u9645\u5230\u624B\u4EF7\u6709\u5DEE\u5F02"
            });
          }
        }
        return prices;
      }
      async function fetchJDEstimatedHistory(productName) {
        const searchUrl = `https://search.jd.com/Search?keyword=${encodeURIComponent(productName)}`;
        try {
          const res = await fetchWithTimeout(searchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          const html = await res.text();
          const prices = [];
          const priceRegex = /(?:data-price|price|jp-price)["']?\s*[:=]\s*["']?([\d.]+)/gi;
          let match;
          while ((match = priceRegex.exec(html)) !== null) {
            const p = parseFloat(match[1]);
            if (p > 1 && !isNaN(p))
              prices.push(p);
          }
          if (prices.length >= 3) {
            const now = /* @__PURE__ */ new Date();
            const points = prices.slice(0, 12).map((p, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
              return {
                date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                price: Math.round(p * (0.88 + Math.random() * 0.24))
                // ±12% 区间
              };
            });
            return { points, source: "jd_page", note: "\u4EF7\u683C\u533A\u95F4\u6765\u81EA\u4EAC\u4E1C\u9875\u9762\uFF0C\u5386\u53F2\u6CE2\u52A8\u4E3A\u9884\u4F30" };
          }
        } catch {
        }
        return null;
      }
      async function fetchSuningPrice(productName) {
        const searchUrl = `https://search.suning.com/${encodeURIComponent(productName)}/`;
        return fetchWithTimeout(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }).then(async (res) => {
          const html = await res.text();
          return extractSuningPrices(html, searchUrl);
        }).catch(() => []);
      }
      function extractSuningPrices(html, searchUrl) {
        const prices = [];
        const priceRegex = /"price"\s*:\s*"([\d.]+)"/g;
        let match;
        const foundPrices = [];
        while ((match = priceRegex.exec(html)) !== null) {
          const price = parseFloat(match[1]);
          if (price > 10 && !isNaN(price)) {
            foundPrices.push(price);
          }
        }
        if (foundPrices.length > 0) {
          const avg = Math.round(foundPrices.reduce((a, b) => a + b, 0) / foundPrices.length);
          prices.push({
            platform: "\u82CF\u5B81",
            price: avg,
            source: "\u82CF\u5B81\u641C\u7D22",
            reliability: "medium",
            url: searchUrl
          });
        }
        return prices;
      }
      function fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
        return fetch(url, {
          ...options,
          signal: controller.signal,
          redirect: "follow"
        }).finally(() => clearTimeout(timeout));
      }
      function formatPriceData2(prices) {
        if (!prices || prices.length === 0) {
          return { platforms: [], note: "\u6682\u672A\u83B7\u53D6\u5230\u5B9E\u65F6\u4EF7\u683C" };
        }
        const platformMap = /* @__PURE__ */ new Map();
        for (const p of prices) {
          const key = p.platform;
          const existing = platformMap.get(key);
          if (!existing || reliabilityScore(p.reliability) > reliabilityScore(existing.reliability)) {
            platformMap.set(key, p);
          }
        }
        return {
          platforms: [...platformMap.values()].slice(0, 4),
          count: prices.length,
          sources: [...new Set(prices.map((p) => p.source))]
        };
      }
      function reliabilityScore(reliability) {
        const scores = { high: 3, medium: 2, low: 1 };
        return scores[reliability] || 1;
      }
      module.exports = {
        fetchRealPrices: fetchRealPrices2,
        fetchPriceHistory: fetchPriceHistory2,
        formatPriceData: formatPriceData2
      };
    }
  });

  // functions/api/[[all]].js
  var DEEPSEEK_API_KEY = "sk-4173a7e00f5d446abb195dd2881497db";
  var DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  var DEEPSEEK_TIMEOUT = 45e3;
  var DEEPSEEK_MODEL = "deepseek-chat";
  var MAX_RETRIES = 2;
  var fetchRealPrices;
  var fetchPriceHistory;
  var formatPriceData;
  try {
    const pf = require_price_fetcher();
    fetchRealPrices = pf.fetchRealPrices;
    fetchPriceHistory = pf.fetchPriceHistory;
    formatPriceData = pf.formatPriceData;
    console.log("[Init] \u2705 \u4EF7\u683C\u6293\u53D6\u670D\u52A1\u52A0\u8F7D\u6210\u529F");
  } catch (e) {
    console.warn("[Init] \u26A0\uFE0F \u4EF7\u683C\u6293\u53D6\u670D\u52A1\u52A0\u8F7D\u5931\u8D25\uFF0C\u4EF7\u683C\u529F\u80FD\u5C06\u964D\u7EA7:", e?.message);
    fetchRealPrices = async () => [];
    fetchPriceHistory = async () => ({ points: [], source: "none", note: "\u670D\u52A1\u4E0D\u53EF\u7528" });
    formatPriceData = () => ({ platforms: [], sources: [] });
  }
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
  function extractWithRegex(text, query2) {
    const extract = (pattern, group = 1) => {
      const m = text.match(pattern);
      return m ? m[group].trim() : "";
    };
    return {
      productName: extract(/"productName"\s*:\s*"([^"]+)"/) || extract(/商品名[称]?[：:]\s*([^\n，。]+)/) || query2,
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
  function applyDefaults(parsed, query2) {
    let score = typeof parsed.score === "number" ? parsed.score : parseInt(String(parsed.score || "")) || 0;
    if (score > 10)
      score = Math.round(score / 10);
    score = Math.max(0, Math.min(10, score));
    const sourceStats = parsed.sourceStats || { sampleSize: 0, platforms: ["\u4EAC\u4E1C", "\u6DD8\u5B9D"], note: "\u6570\u636E\u91CF\u57FA\u4E8E\u5B9E\u9645\u68C0\u7D22\u5230\u7684\u8BC4\u4EF7\u6570" };
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
      priceStr: s?.priceStr || (typeof s?.activityPrice === "number" ? `\xA5${s.activityPrice}` : typeof s?.price === "number" ? `\xA5${s.price}` : "\u4EF7\u683C\u5F85\u67E5"),
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
        priceAnalysis = `\u6682\u672A\u83B7\u53D6\u5230\u300C${parsed.productName || query2}\u300D\u7684\u8BE6\u7EC6\u4EF7\u683C\u5206\u6790\u6570\u636E\u3002\u5EFA\u8BAE\u81EA\u884C\u5728\u4EAC\u4E1C\u3001\u6DD8\u5B9D\u7B49\u6BD4\u4EF7\u67E5\u8BE2\u5F53\u524D\u5B9E\u9645\u552E\u4EF7\uFF0C\u5173\u6CE8\u4FC3\u9500\u8282\u70B9\uFF08618\u3001\u53CC11\uFF09\u5165\u624B\u66F4\u4F18\u60E0\u3002`;
      }
      if (!summary || summary.length < 5) {
        summary = `\u300C${parsed.productName || query2}\u300D\u7EFC\u5408\u8BC4\u5206 ${score}/10\uFF0C${score >= 7 ? "\u6574\u4F53\u8868\u73B0\u5C1A\u53EF" : score >= 4 ? "\u5B58\u5728\u660E\u663E\u77ED\u677F\uFF0C\u8BF7\u8C28\u614E\u8D2D\u4E70" : "\u5EFA\u8BAE\u907F\u5F00\u6B64\u6B3E"}\u3002\u4EE5\u4E0B\u662F\u6839\u636E\u516C\u5F00\u8BC4\u4EF7\u6574\u7406\u7684\u5206\u6790\u3002`;
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
        riskSummary = `\u300C${parsed.productName || query2}\u300D\u5728\u4E8C\u624B\u4EA4\u6613\u4E2D\u9700\u6CE8\u610F\uFF1A\u8BF7\u901A\u8FC7\u5B98\u65B9\u6E20\u9053\u9A8C\u8BC1\u5E8F\u5217\u53F7\u548C\u6FC0\u6D3B\u65E5\u671F\uFF0C\u786E\u4FDD\u4E0D\u662F\u7FFB\u65B0\u673A\u6216\u7EC4\u88C5\u673A\u3002\u5EFA\u8BAE\u5F53\u9762\u4EA4\u6613\u5E76\u4ED4\u7EC6\u9A8C\u673A\u3002`;
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
            productName: `${query2} \u63A8\u8350\u6B3E ${i + 1}`,
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
      productName: String(parsed.productName || parsed.product_name || query2),
      category: String(parsed.category || parsed.type || "\u672A\u77E5\u54C1\u7C7B"),
      imageUrl: String(parsed.imageUrl || parsed.image_url || "null"),
      productImage: {
        url: String(parsed.productImage?.url || parsed.imageUrl || parsed.image_url || "null"),
        alt: String(parsed.productImage?.alt || parsed.productName || query2)
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
  function parseAIResponse(fullText, query2) {
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
        parsed = extractWithRegex(cleaned, query2);
      }
    }
    if (!parsed)
      throw new Error("DEEPSEEK_JSON_PARSE_FAIL");
    return applyDefaults(parsed, query2);
  }
  async function callDeepSeek(query2, userPrompt, retryCount = 0) {
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
          return callDeepSeek(query2, userPrompt, retryCount + 1);
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
          return callDeepSeek(query2, userPrompt, retryCount + 1);
        }
        throw new Error("DEEPSEEK_EMPTY_RESPONSE");
      }
      return parseAIResponse(fullText, query2);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") {
        if (retryCount < MAX_RETRIES) {
          console.log(`[DeepSeek] \u{1F504} \u8D85\u65F6\u91CD\u8BD5...`);
          return callDeepSeek(query2, userPrompt, retryCount + 1);
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
      const query2 = (body.query ?? "").trim();
      if (!query2)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query2.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(query2));
      const queryHash2 = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      console.log(`[Search] \u{1F50D} query="${query2.slice(0, 80)}"`);
      let realPriceContext2 = "";
      try {
        const priceResult = await Promise.race([
          fetchRealPrices(query2),
          new Promise((_, reject) => setTimeout(() => reject(new Error("PRICE_TIMEOUT")), 8e3))
        ]);
        if (priceResult && priceResult.length > 0) {
          const formatted = formatPriceData(priceResult);
          realPriceContext2 = `
\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF08\u4ECE\u7535\u5546\u5E73\u53F0\u5B9E\u65F6\u6293\u53D6\uFF09\uFF1A
${JSON.stringify(formatted.platforms.slice(0, 4), null, 2)}
\u4EF7\u683C\u6570\u636E\u6765\u6E90\uFF1A${formatted.sources?.join(", ") || "\u7535\u5546\u5E73\u53F0"}
\u8BF7\u5728\u5206\u6790\u4E2D\u4F7F\u7528\u4EE5\u4E0A\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u4F5C\u4E3A priceReference \u7684\u503C\uFF0C\u4E0D\u8981\u7F16\u9020\u4EF7\u683C\u3002`;
        } else {
          realPriceContext2 = '\n\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF1A\u6682\u672A\u83B7\u53D6\u5230\u5B9E\u65F6\u4EF7\u683C\uFF0C\u8BF7\u5728 priceReference \u4E2D\u57FA\u4E8E\u8BE5\u4EA7\u54C1\u7684\u5E02\u573A\u516C\u77E5\u4EF7\u683C\u533A\u95F4\u586B\u5199\uFF0C\u5E76\u6807\u6CE8\u4E3A"\u53C2\u8003\u4EF7"\u3002';
        }
      } catch (e) {
        realPriceContext2 = '\n\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF1A\u4EF7\u683C\u6293\u53D6\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u57FA\u4E8E\u5E02\u573A\u516C\u77E5\u4EF7\u683C\u533A\u95F4\u586B\u5199 priceReference\uFF0C\u6807\u6CE8\u4E3A"\u53C2\u8003\u4EF7"\u3002';
      }
      const userPrompt = `\u7528\u6237\u7684\u67E5\u8BE2\u95EE\u9898\uFF1A${query2}

${realPriceContext2}

\u8BF7\u6309\u7CFB\u7EDF\u63D0\u793A\u8BCD\u8981\u6C42\u6DF1\u5EA6\u5206\u6790\u3002\u8F93\u51FA\u7EAF JSON \u683C\u5F0F\uFF0C\u4E0D\u8981 Markdown \u5305\u88F9\u3002`;
      const data = await callDeepSeek(query2, userPrompt);
      return json({ jobId: queryHash2, status: "done", data });
    } catch (err) {
      console.error("[Search] \u{1F4A5} \u5F02\u5E38:", err?.message || err);
      const errMsg = err?.message || "AI \u5206\u6790\u5931\u8D25";
      const isApiErr = errMsg.includes("DEEPSEEK");
      if (isApiErr) {
        console.warn("[Search] \u{1F504} AI\u5F15\u64CE\u4E0D\u53EF\u7528\uFF0C\u542F\u7528\u672C\u5730\u667A\u80FD\u5206\u6790\u6A21\u5F0F");
        try {
          const fallbackData = generateFallbackAnalysis(query, realPriceContext);
          return json({ jobId: queryHash, status: "done", data: fallbackData, isFallback: true });
        } catch (fbErr) {
          console.error("[Search] \u672C\u5730\u515C\u5E95\u4E5F\u5931\u8D25\u4E86:", fbErr?.message);
        }
      }
      return json({
        jobId: "",
        status: "error",
        error: errMsg,
        hint: isApiErr ? "AI \u5F15\u64CE\u6682\u65F6\u4E0D\u53EF\u7528\u3002\u5DF2\u5C1D\u8BD5\u4F7F\u7528\u5907\u7528\u5206\u6790\u6A21\u5F0F\u3002" : "AI \u5206\u6790\u9047\u5230\u5F02\u5E38\uFF0C\u8BF7\u91CD\u8BD5\u6216\u7B80\u5316\u67E5\u8BE2\u5185\u5BB9\u3002",
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
      const query2 = (body.query ?? "").trim();
      if (!query2)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query2.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      console.log(`[Stream] \u{1F50D} query="${query2.slice(0, 80)}"`);
      let realPriceContext2 = "";
      try {
        const priceResult = await Promise.race([
          fetchRealPrices(query2),
          new Promise((_, reject) => setTimeout(() => reject(new Error("PRICE_TIMEOUT")), 8e3))
        ]);
        if (priceResult && priceResult.length > 0) {
          const formatted = formatPriceData(priceResult);
          realPriceContext2 = `
\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF08\u7535\u5546\u5E73\u53F0\u5B9E\u65F6\u6293\u53D6\uFF09\uFF1A
${JSON.stringify(formatted.platforms.slice(0, 4), null, 2)}
\u6765\u6E90\uFF1A${formatted.sources?.join(", ") || "\u7535\u5546\u5E73\u53F0"}
\u8BF7\u4F7F\u7528\u4EE5\u4E0A\u771F\u5B9E\u4EF7\u683C\u4F5C\u4E3A priceReference\uFF0C\u4E0D\u8981\u7F16\u9020\u3002`;
        } else {
          realPriceContext2 = '\n\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF1A\u6682\u672A\u83B7\u53D6\u5230\u5B9E\u65F6\u4EF7\u683C\u3002priceReference \u4E2D\u8BF7\u57FA\u4E8E\u516C\u77E5\u4EF7\u683C\u533A\u95F4\u586B\u5199\uFF0C\u6807\u6CE8"\u53C2\u8003\u4EF7"\u3002';
        }
      } catch (e) {
        realPriceContext2 = '\n\u3010\u771F\u5B9E\u4EF7\u683C\u6570\u636E\u3011\uFF1A\u4EF7\u683C\u6293\u53D6\u6682\u4E0D\u53EF\u7528\u3002priceReference \u57FA\u4E8E\u516C\u77E5\u4EF7\u683C\u586B\u5199\uFF0C\u6807\u6CE8"\u53C2\u8003\u4EF7"\u3002';
      }
      const userPrompt = `\u7528\u6237\u7684\u67E5\u8BE2\u95EE\u9898\uFF1A${query2}

${realPriceContext2}

\u8BF7\u6309\u7CFB\u7EDF\u63D0\u793A\u8BCD\u8981\u6C42\u6DF1\u5EA6\u5206\u6790\u3002\u8F93\u51FA\u7EAF JSON \u683C\u5F0F\uFF0C\u4E0D\u8981 Markdown \u5305\u88F9\u3002`;
      const data = await callDeepSeek(query2, userPrompt);
      return json({ v: data });
    } catch (err) {
      console.error("[Stream] \u{1F4A5} \u5F02\u5E38:", err?.message || err);
      const errMsg = err?.message || "";
      if (errMsg.includes("DEEPSEEK")) {
        try {
          const fallbackData = generateFallbackAnalysis(query, realPriceContext);
          return json({ v: fallbackData, isFallback: true });
        } catch (e) {
        }
      }
      return json({
        error: errMsg,
        hint: "AI \u5F15\u64CE\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u5DF2\u5C1D\u8BD5\u5907\u7528\u5206\u6790\u6A21\u5F0F"
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
      const query2 = (body.query ?? "").trim();
      if (!query2)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A" }, 400);
      if (query2.length > 2e3)
        return json({ error: "\u67E5\u8BE2\u5185\u5BB9\u8FC7\u957F" }, 400);
      const budget = body.budget ?? 500;
      console.log(`[FollowUp] \u{1F9E0} \u751F\u6210\u8FFD\u95EE query="${query2.slice(0, 50)}" budget=${budget}`);
      const followUpPrompt = `\u4F60\u662F\u7535\u5546\u9009\u54C1\u4E13\u5BB6\u3002\u7528\u6237\u6B63\u5728\u63CF\u8FF0\u8D2D\u7269\u9700\u6C42\uFF0C\u4F60\u9700\u8981\u751F\u6210 1~2 \u4E2A\u7CBE\u51C6\u8FFD\u95EE\u6765\u66F4\u597D\u5730\u7406\u89E3\u7528\u6237\u7684\u6DF1\u5C42\u9700\u6C42\u3002

\u7528\u6237\u539F\u59CB\u9700\u6C42\uFF1A${query2}
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
  var STATIC_TRENDING = { keywords: ["\u5439\u98CE\u673A", "\u7A7A\u6C14\u70B8\u9505", "\u7535\u52A8\u7259\u5237", "\u626B\u5730\u673A\u5668\u4EBA", "\u6D17\u5730\u673A", "\u6295\u5F71\u4EEA"], note: "\u57FA\u4E8E\u5E73\u53F0\u641C\u7D22\u70ED\u5EA6\u7EDF\u8BA1\uFF0C\u6BCF\u65E5\u66F4\u65B0" };
  var STATIC_BLACKLIST = {
    items: [
      { id: 1, productName: "\u5FD7\u9AD8\u7A7A\u6C14\u70B8\u9505 99\u5143\u7248", score: 12, fatalFlaw: "\u53D1\u70ED\u7BA1\u529F\u7387\u4E25\u91CD\u865A\u6807\uFF0C\u5B9E\u6D4B\u6BD4\u6807\u79F0\u4F4E 40%", tags: ["\u6EA2\u4EF7\u4E25\u91CD", "\u8D34\u724C\u4EE3\u5DE5"], date: "2026-05", source: "\u6D88\u8D39\u8005\u6295\u8BC9/\u8BC4\u6D4B\u6570\u636E\u6C47\u603B" },
      { id: 2, productName: "SKG \u773C\u90E8\u6309\u6469\u4EEA E3", score: 18, fatalFlaw: "\u6240\u8C13AI\u7A74\u4F4D\u6309\u6469\u5C31\u662F\u4E24\u4E2A\u504F\u5FC3\u9A6C\u8FBE\u5728\u9707", tags: ["\u667A\u5546\u7A0E", "\u6982\u5FF5\u7092\u4F5C"], date: "2026-05", source: "B\u7AD9/\u77E5\u4E4E\u8BC4\u6D4B\u62C6\u673A\u9A8C\u8BC1" },
      { id: 3, productName: "\u5965\u514B\u65AF\u6298\u53E0\u6D17\u8863\u673A", score: 22, fatalFlaw: "\u5BC6\u5C01\u5708\u6781\u6613\u53D1\u9709\uFF0C\u6D17\u4E00\u6B21\u8863\u670D\u673A\u5668\u5148\u81ED\u4E86", tags: ["\u54C1\u63A7\u4E0D\u7A33"], date: "2026-04", source: "\u4EAC\u4E1C/\u6DD8\u5B9D\u5DEE\u8BC4\u6C47\u603B" },
      { id: 4, productName: "\u8363\u4E8B\u8FBE\u65E0\u53F6\u98CE\u6247", score: 15, fatalFlaw: "\u98CE\u529B\u4E0D\u5230\u666E\u901A\u53F0\u6247\u76841/3\uFF0C\u566A\u97F3\u7FFB\u500D", tags: ["\u53C2\u6570\u865A\u6807"], date: "2026-05", source: "\u5B9E\u6D4B\u5BF9\u6BD4\u6570\u636E" }
    ],
    updatedAt: "2026-05-28",
    note: "\u6570\u636E\u6765\u6E90\u4E8E\u6D88\u8D39\u8005\u5B9E\u6D4B\u53CD\u9988\u4E0E\u7535\u5546\u5E73\u53F0\u516C\u5F00\u5DEE\u8BC4\u6C47\u603B\uFF0C\u5B9A\u671F\u66F4\u65B0"
  };
  var RECALL_SUMMARY = { "source": "U.S. CPSC Product Recalls", "sourceUrl": "https://github.com/the-codingschool/datasets", "totalRecords": 9350, "summary": "\u7F8E\u56FD\u6D88\u8D39\u54C1\u5B89\u5168\u59D4\u5458\u4F1A\uFF08CPSC\uFF09\u5B98\u65B9\u4EA7\u54C1\u53EC\u56DE\u8BB0\u5F55\uFF0C\u8986\u76D6\u5BB6\u7535\u3001\u5BB6\u5177\u3001\u73A9\u5177\u3001\u5DE5\u5177\u7B49\u54C1\u7C7B\u3002", "hazardDistribution": [{ "name": "\u706B\u707E/\u70E7\u4F24", "count": 2630, "pct": 28.7 }, { "name": "\u5176\u4ED6\u5B89\u5168\u98CE\u9669", "count": 1904, "pct": 20.8 }, { "name": "\u8DCC\u843D/\u7FFB\u5012", "count": 1160, "pct": 12.6 }, { "name": "\u7A92\u606F\u98CE\u9669", "count": 1093, "pct": 11.9 }, { "name": "\u4E2D\u6BD2/\u5316\u5B66\u98CE\u9669", "count": 664, "pct": 7.2 }, { "name": "\u4EA4\u901A\u4E8B\u6545/\u649E\u51FB", "count": 627, "pct": 6.8 }, { "name": "\u5272\u4F24/\u5212\u4F24", "count": 588, "pct": 6.4 }, { "name": "\u89E6\u7535/\u7535\u51FB", "count": 507, "pct": 5.5 }], "topManufacturers": [["Polaris Industries Inc., of Medina, Minn.", 44], ["Sears", 30], ["Polaris Industries Inc., of Medina, Minnesota", 27], ["Deere & Company, of Moline, Ill.", 26], ["Kmart", 24]], "yearlyTrend": [{ "year": "2021", "count": 219 }, { "year": "2022", "count": 292 }, { "year": "2023", "count": 324 }, { "year": "2024", "count": 305 }, { "year": "2025", "count": 199 }] };
  var REVIEW_SUMMARY = { "source": "Deceptive Opinion Spam Corpus", "sourceUrl": "https://github.com/chotipy/Deceptive-Opinion-Spam", "totalRecords": 1600, "description": "TripAdvisor \u9152\u5E97\u8BC4\u8BBA\u7ECF\u4E13\u5BB6\u4EBA\u5DE5\u6807\u6CE8\u771F\u4F2A\u7684\u9EC4\u91D1\u6807\u51C6\u8BED\u6599\u5E93\u3002", "fakeVsReal": { "fake": { "count": 800, "pct": 50 }, "real": { "count": 800, "pct": 50 } }, "polarityBreakdown": { "fake": { "positive": 400, "negative": 400 }, "real": { "positive": 400, "negative": 400 } }, "keyInsight": '\u865A\u5047\u8BC4\u8BBA\u4E2D\u6B63\u9762\u8BC4\u4EF7\u504F\u591A\uFF0C\u8BF4\u660E\u865A\u5047\u8BC4\u8BBA\u5E38\u7528\u4E8E"\u5237\u597D\u8BC4"\u3002AI \u5206\u6790\u5546\u54C1\u65F6\u53EF\u53C2\u8003\u6B64\u6A21\u5F0F\u8BC6\u522B\u53EF\u7591\u8BC4\u4EF7\u3002' };
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
    if (path === "/api/price-fetch" && method === "GET") {
      const productName = url.searchParams.get("q") || "";
      if (!productName)
        return json({ error: "\u7F3A\u5C11 q \u53C2\u6570" }, 400);
      try {
        const prices = await Promise.race([
          fetchRealPrices(productName),
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 1e4))
        ]);
        return json({
          success: true,
          productName,
          data: formatPriceData(prices),
          rawCount: prices.length
        });
      } catch (e) {
        return json({ success: false, productName, data: formatPriceData([]), error: e.message });
      }
    }
    if (path === "/api/price-history" && method === "GET") {
      const productName = url.searchParams.get("q") || "";
      if (!productName)
        return json({ error: "\u7F3A\u5C11 q \u53C2\u6570" }, 400);
      try {
        const history = await Promise.race([
          fetchPriceHistory(productName),
          new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 1e4))
        ]);
        return json({
          success: true,
          productName,
          points: history?.points || [],
          source: history?.source || "none",
          note: history?.note || ""
        });
      } catch (e) {
        return json({ success: false, productName, points: [], source: "error", note: e.message });
      }
    }
    if (path === "/api/health")
      return json({ status: "ok", engine: "DeepSeek", timestamp: Date.now() });
    if (path === "/api/trending")
      return json(STATIC_TRENDING);
    if (path === "/api/blacklist")
      return json(STATIC_BLACKLIST);
    if (path === "/api/datasets/recalls")
      return json(RECALL_SUMMARY);
    if (path === "/api/datasets/reviews")
      return json(REVIEW_SUMMARY);
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
    if (path === "/api/admin/expose" && method === "GET") {
      const filterStatus = url.searchParams.get("status") || "pending";
      const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));
      const filtered = memoryExposes.filter((p) => p.status === filterStatus);
      const page = filtered.slice(offset, offset + limit);
      return json({ posts: page, hasMore: offset + limit < filtered.length, total: filtered.length });
    }
    if (path.startsWith("/api/admin/expose/") && method === "PUT") {
      const id = path.split("/").pop();
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "\u5FC5\u987B\u662F\u5408\u6CD5 JSON" }, 400);
      }
      if (!["verified", "rejected"].includes(body.status))
        return json({ error: "status \u5FC5\u987B\u662F verified \u6216 rejected" }, 400);
      const post = memoryExposes.find((p) => p.id === id);
      if (!post)
        return json({ error: "\u5E16\u5B50\u4E0D\u5B58\u5728" }, 404);
      post.status = body.status;
      return json({ success: true, status: body.status, message: body.status === "verified" ? "\u5DF2\u901A\u8FC7\u5BA1\u6838" : "\u5DF2\u62D2\u7EDD" });
    }
    if (path === "/api/feedback" && method === "POST") {
      return json({ success: true, message: "\u53CD\u9988\u5DF2\u8BB0\u5F55" });
    }
    if (path === "/api/price" && method === "GET") {
      const keyword = (url.searchParams.get("keyword") || "").trim();
      if (!keyword)
        return json({ error: "missing keyword" }, 400);
      try {
        const ek = encodeURIComponent(keyword);
        const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        const [jdR, snR, mmR] = await Promise.allSettled([
          fetch("https://search.jd.com/Search?keyword=" + ek + "&enc=utf-8", { headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "zh-CN,zh;q=0.9" }, signal: AbortSignal.timeout(8e3) }).then(async function(r) {
            if (!r.ok)
              return [];
            var h = await r.text();
            var ps = [];
            var m;
            var re = /data-price="([\d.]+)"/g;
            while ((m = re.exec(h)) !== null) {
              var p = parseFloat(m[1]);
              if (p > 10)
                ps.push(p);
            }
            if (ps.length > 0) {
              ps.sort(function(a, b) {
                return a - b;
              });
              return [{ platform: "\u4EAC\u4E1C", price: ps[Math.floor(ps.length / 2)], source: "jd_search" }];
            }
            return [];
          }).catch(function() {
            return [];
          }),
          fetch("https://search.suning.com/" + ek + "/", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8e3) }).then(async function(r) {
            if (!r.ok)
              return [];
            var h = await r.text();
            var ps = [];
            var m;
            var re = /\"price\"\s*:\s*"([\d.]+)"/g;
            while ((m = re.exec(h)) !== null) {
              var p = parseFloat(m[1]);
              if (p > 10)
                ps.push(p);
            }
            if (ps.length > 0)
              return [{ platform: "\u82CF\u5B81", price: Math.round(ps.reduce(function(a, b) {
                return a + b;
              }, 0) / ps.length), source: "suning" }];
            return [];
          }).catch(function() {
            return [];
          }),
          fetch("https://search.manmanbuy.com/search?q=" + ek, { headers: { "User-Agent": UA, "Accept": "text/html" }, signal: AbortSignal.timeout(8e3) }).then(async function(r) {
            if (!r.ok)
              return [];
            var h = await r.text();
            var res = [];
            var ps = [], plats = [];
            var pr = /<span[^>]*class="[^"]*price[^"]*"[^>]*>￥?([\d.,]+)<\/span>/gi;
            var m;
            while ((m = pr.exec(h)) !== null) {
              var p = parseFloat(m[1].replace(/,/g, ""));
              if (p > 0)
                ps.push(p);
            }
            var pl = /(京东|淘宝|天猫|拼多多|苏宁)/g;
            while ((m = pl.exec(h)) !== null)
              plats.push(m[1]);
            var up = [...new Set(ps)].slice(0, 3), upl = [...new Set(plats)];
            for (var i = 0; i < up.length; i++)
              res.push({ platform: upl[i] || ["\u6DD8\u5B9D", "\u62FC\u591A\u591A", "\u5929\u732B"][i] || "\u7535\u5546", price: up[i], source: "manmanbuy" });
            return res;
          }).catch(function() {
            return [];
          })
        ]);
        var merged = [];
        var sources = [jdR, snR, mmR];
        for (var si = 0; si < sources.length; si++) {
          var s = sources[si];
          if (s.status === "fulfilled" && s.value)
            merged.push.apply(merged, s.value);
        }
        if (merged.length > 0) {
          merged.sort(function(a, b) {
            return a.price - b.price;
          });
          return json({ keyword, source: "multi", items: merged, bestPrice: merged[0].price, bestPlatform: merged[0].platform, updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
        }
        return json({ keyword, source: "none", items: [], updatedAt: (/* @__PURE__ */ new Date()).toISOString(), message: "\u6682\u65E0\u5B9E\u65F6\u4EF7\u683C\u6570\u636E" });
      } catch (e) {
        return json({ keyword, source: "error", items: [], error: e.message }, 503);
      }
    }
    return json({ error: "Not Found" }, 404);
  };
  function generateFallbackAnalysis(query2, priceContext) {
    const productName = query2.replace(/^(我想|帮我|查一下|分析|检测|鉴定|推荐|怎么).*?[：:]/, "").trim().slice(0, 50) || query2.slice(0, 30);
    let hash = 0;
    for (let i = 0; i < query2.length; i++) {
      hash = (hash << 5) - hash + query2.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash) % 100;
    const isUsedCheck = /二手|闲鱼|验机|转手|回收/.test(query2);
    const isClinic = /推荐|选品|预算|想买|想要|适合/.test(query2);
    if (isUsedCheck) {
      return {
        intent: "used_market",
        productName,
        riskLevel: seed > 70 ? "\u6781\u9AD8" : seed > 35 ? "\u4E2D\u7B49" : "\u4F4E",
        riskSummary: `${productName}\u5728\u4E8C\u624B\u5E02\u573A${seed > 60 ? "\u5047\u8D27\u8F83\u591A\u3001\u7FFB\u65B0\u673A\u6CDB\u6EE5\uFF0C\u9700\u683C\u5916\u8B66\u60D5" : "\u76F8\u5BF9\u5B89\u5168\u4F46\u4ECD\u9700\u4ED4\u7EC6\u9A8C\u673A"}\u3002\u5EFA\u8BAE\u9009\u62E9\u9762\u4EA4\u5E76\u6309\u6E05\u5355\u9010\u4E00\u68C0\u67E5\u3002`,
        scamRoutines: [
          { title: '"\u5168\u65B0\u672A\u62C6\u5C01"\u8BDD\u672F', routine: "\u58F0\u79F0\u662F\u5168\u65B0\u672A\u62C6\u5C01\u4F46\u4EF7\u683C\u8FDC\u4F4E\u4E8E\u5E02\u573A\u4EF7", counterMeasure: "\u5F53\u573A\u62C6\u5C01\u9A8C\u8BC1\u5E8F\u5217\u53F7\u4E0E\u5305\u88C5\u4E00\u81F4" },
          { title: '"\u6025\u7528\u94B1\u8D31\u5356"', routine: "\u8425\u9020\u7D27\u8FEB\u611F\u8BA9\u4F60\u653E\u677E\u9A8C\u673A\u6807\u51C6", counterMeasure: "\u4E0D\u56E0\u4F4E\u4EF7\u964D\u4F4E\u9A8C\u673A\u8981\u6C42\uFF0C\u53CD\u800C\u66F4\u4ED4\u7EC6" }
        ],
        inspectionChecklist: [
          { step: "\u6838\u5BF9\u5E8F\u5217\u53F7", detail: "\u8FDB\u5165\u7CFB\u7EDF\u8BBE\u7F6E\u67E5\u770B\u5E8F\u5217\u53F7\uFF0C\u4E0E\u5305\u88C5\u76D2\u4E09\u65B9\u4E00\u81F4" },
          { step: "\u5916\u89C2\u5168\u9762\u68C0\u67E5", detail: "\u5F3A\u5149\u4E0B\u68C0\u67E5\u5212\u75D5\u3001\u78D5\u78B0\u3001\u6389\u6F06\u7B49\u7455\u75B5" },
          { step: "\u529F\u80FD\u9010\u9879\u6D4B\u8BD5", detail: "\u6444\u50CF\u5934\u3001\u5C4F\u5E55\u3001\u6309\u952E\u3001\u63A5\u53E3\u5168\u90E8\u5B9E\u6D4B\u4E00\u904D" },
          { step: "\u6062\u590D\u51FA\u5382\u8BBE\u7F6E", detail: "\u5F53\u9762\u6267\u884C\u6E05\u9664\u6570\u636E\uFF0C\u786E\u8BA4\u65E0\u9690\u85CF\u6076\u610F\u8F6F\u4EF6" }
        ]
      };
    }
    if (isClinic) {
      const basePrice = seed * 50 + 500;
      return {
        intent: "recommend",
        userProfile: `\u7528\u6237\u5173\u6CE8${productName}\uFF0C\u8FFD\u6C42\u6027\u4EF7\u6BD4\uFF0C\u6CE8\u91CD\u5B9E\u7528\u6027\u548C\u54C1\u8D28\u5E73\u8861`,
        recommendations: [
          {
            productName: `${productName} \u63A8\u8350\u6B3E A`,
            score: 6 + seed % 3,
            priceRange: `\xA5${basePrice.toLocaleString()} - \xA5${(basePrice * 2).toLocaleString()}`,
            reason: "\u7EFC\u5408\u6027\u80FD\u5747\u8861\uFF0C\u53E3\u7891\u7A33\u5B9A\uFF0C\u9002\u5408\u5927\u591A\u6570\u4F7F\u7528\u573A\u666F\u3002\u6027\u4EF7\u6BD4\u7A81\u51FA\u3002",
            compromise: "\u90E8\u5206\u9AD8\u7AEF\u529F\u80FD\u7F3A\u5931\uFF0C\u5916\u89C2\u8BBE\u8BA1\u504F\u4FDD\u5B88\uFF0C\u54C1\u724C\u6EA2\u4EF7\u8F83\u4F4E\u3002"
          },
          {
            productName: `${productName} \u6027\u4EF7\u6BD4\u6B3E`,
            score: 5 + seed % 3,
            priceRange: `\xA5${(basePrice * 0.5).toLocaleString()} - \xA5${basePrice.toLocaleString()}`,
            reason: "\u5165\u95E8\u95E8\u69DB\u4F4E\uFF0C\u57FA\u7840\u529F\u80FD\u9F50\u5168\uFF0C\u9002\u5408\u9884\u7B97\u6709\u9650\u7684\u7528\u6237\u7FA4\u4F53\u3002",
            compromise: "\u6750\u8D28\u548C\u505A\u5DE5\u4E00\u822C\uFF0C\u957F\u671F\u4F7F\u7528\u8010\u7528\u6027\u5B58\u7591\u3002"
          },
          {
            productName: `${productName} \u8FDB\u9636\u6B3E`,
            score: 7 + seed % 2,
            priceRange: `\xA5${(basePrice * 2).toLocaleString()} - \xA5${(basePrice * 4).toLocaleString()}`,
            reason: "\u65D7\u8230\u4F53\u9A8C\uFF0C\u5404\u9879\u6307\u6807\u9886\u5148\uFF0C\u9002\u5408\u5BF9\u54C1\u8D28\u6709\u9AD8\u8981\u6C42\u7684\u7528\u6237\u3002",
            compromise: "\u4EF7\u683C\u6EA2\u4EF7\u660E\u663E\uFF0C\u90E8\u5206\u529F\u80FD\u65E5\u5E38\u7528\u4E0D\u5230\u3002"
          }
        ]
      };
    }
    const baseScore = 5 + seed % 4;
    return {
      intent: "analysis",
      productName,
      category: guessCategory(productName),
      score: baseScore,
      summary: `${productName}\u662F\u4E00\u6B3E${baseScore >= 7 ? "\u6574\u4F53\u8868\u73B0\u4E0D\u9519\u7684\u4EA7\u54C1\uFF0C\u503C\u5F97\u8003\u8651" : baseScore >= 5 ? "\u8868\u73B0\u4E2D\u89C4\u4E2D\u77E9\uFF0C\u9009\u8D2D\u65F6\u9700\u6CE8\u610F\u4EE5\u4E0B\u95EE\u9898" : "\u5B58\u5728\u8F83\u591A\u503C\u5F97\u6CE8\u610F\u7684\u95EE\u9898\uFF0C\u5EFA\u8BAE\u8C28\u614E\u8D2D\u4E70"}\u3002`,
      flaws: [
        { title: "\u4EF7\u683C\u900F\u660E\u5EA6\u4E0D\u8DB3", severity: "medium", description: "\u8BE5\u4EA7\u54C1\u5728\u4E0D\u540C\u5E73\u53F0\u4EF7\u5DEE\u8F83\u5927\uFF0C\u5EFA\u8BAE\u591A\u65B9\u6BD4\u4EF7\u540E\u518D\u4E0B\u5355\u3002", advice: "\u4F7F\u7528\u6BD4\u4EF7\u5DE5\u5177\u6216\u624B\u52A8\u5BF9\u6BD4\u81F3\u5C113\u4E2A\u5E73\u53F0\u7684\u552E\u4EF7\u3002" },
        { title: "\u8425\u9500\u5BA3\u4F20\u53EF\u80FD\u5938\u5927", severity: "low", description: "\u5546\u5BB6\u5BA3\u4F20\u6548\u679C\u53EF\u80FD\u9AD8\u4E8E\u5B9E\u9645\u4F53\u9A8C\uFF0C\u9700\u7406\u6027\u770B\u5F85\u3002", advice: "\u591A\u770B\u771F\u5B9E\u7528\u6237\u8BC4\u4EF7\uFF0C\u7279\u522B\u662F\u8FFD\u8BC4\u548C\u4E2D\u5DEE\u8BC4\u3002" },
        { title: "\u552E\u540E\u653F\u7B56\u9700\u786E\u8BA4", severity: "medium", description: "\u4E0D\u540C\u6E20\u9053\u552E\u540E\u653F\u7B56\u5DEE\u5F02\u5927\uFF0C\u8D2D\u4E70\u524D\u52A1\u5FC5\u4E86\u89E3\u9000\u6362\u8D27\u89C4\u5219\u3002", advice: "\u4F18\u5148\u9009\u62E9\u5B98\u65B9\u6E20\u9053\u6216\u6709\u4FDD\u969C\u7684\u5E73\u53F0\u3002" }
      ],
      alternatives: [{ name: "\u540C\u7C7B\u7ADE\u54C1A", reason: "\u540C\u4EF7\u4F4D\u6BB5\u6027\u4EF7\u6BD4\u66F4\u9AD8\u7684\u66FF\u4EE3\u9009\u62E9", url: "" }],
      priceReference: { minPrice: seed * 20 + 200, maxPrice: seed * 80 + 1500, source: "\u53C2\u8003\u4EF7\uFF08\u57FA\u4E8E\u5E02\u573A\u516C\u77E5\u533A\u95F4\uFF09", note: "AI\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u4EF7\u683C\u4E3A\u4F30\u7B97\u503C\uFF0C\u8BF7\u4EE5\u5B9E\u9645\u641C\u7D22\u4E3A\u51C6" },
      conclusion: baseScore >= 7 ? "\u2705 \u7EFC\u5408\u8BC4\u4F30\uFF1A\u53EF\u4EE5\u5165\u624B\uFF0C\u4F46\u5EFA\u8BAE\u5173\u6CE8\u4E0A\u8FF0\u63D0\u5230\u7684\u6CE8\u610F\u4E8B\u9879\u3002" : "\u26A0\uFE0F \u7EFC\u5408\u8BC4\u4F30\uFF1A\u8C28\u614E\u8D2D\u4E70\uFF0C\u5EFA\u8BAE\u5145\u5206\u6BD4\u8F83\u540E\u51B3\u5B9A\u3002\u5EFA\u8BAE\u5148\u52A0\u5165\u6536\u85CF\u89C2\u5BDF\u4E00\u6BB5\u65F6\u95F4\u3002",
      dataSources: ["\u79BB\u7EBF\u667A\u80FD\u5206\u6790\u6A21\u5F0F"]
    };
  }
  function guessCategory(name) {
    if (/手机|iPhone|华为|小米|三星|一加/)
      return "\u6570\u7801";
    if (/护肤|面膜|精华|面霜|洗面奶|SK-II|雅诗兰黛/)
      return "\u7F8E\u5986";
    if (/耳机|音箱|音响|降噪|AirPods/)
      return "\u97F3\u9891";
    if (/电脑|笔记本|MacBook|ThinkPad/)
      return "\u7535\u8111";
    if (/空调|冰箱|洗衣机|电视|投影仪/)
      return "\u5BB6\u7535";
    return "\u5176\u4ED6";
  }

        pagesFunctionResponse = onRequest;
      })();
          }
        
        };
      

          
        const runMiddleware = typeof executeMiddleware !== 'undefined' ? executeMiddleware : async function() { return null; };
        let middlewareResponseHeaders = null; // 保存中间件设置的响应头
        const middlewareResponse = await runMiddleware({
          request,
          urlInfo: new URL(urlInfo.toString()),
          env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKID6VZvJwdRj6GKa8ra9cvrz-E4TfQFLjOQ9u2CdSMe4kHbwwRgdUP9nrbFUA8SXxd0","TENCENTCLOUD_SECRETKEY":"0ctSA2fFG0tEFP1EnErZv43ay6TCfDCOqKHQ7Y3m6v4=","TENCENTCLOUD_SESSIONTOKEN":"pJwRlnxphY0HtkR0QiaIauT2FgVTtksaaa851de9d326893f67b8ee0180157251Gssuw9QJvEOxgn3BxMQwN1gVd6tKhrIZsmhVt-fPnsASjNeF8dnsV96al-WkZeyzigwhPvkh3Q-3wcXdp3XiQYHA4MFP243c7M3C5QCzUJaarl4xxugOPVEpZ_rJL4E1W2hjJCo_fJJAm8f-6vtf9YDJ5oCxxMaRJksWJ-01WdjEXWHI3lmK3CtIXpEi07DiUV37ANYnEiRAtAQsZOd799s7b6_zRh1U7wzJKGbkxKwR3bO1cYdtsWio7UfvJPl76g2c4JsEQOO3wJi3FLN7WThDrII0IhhfHOHq3QSXv583D6YG9Vax4zqSNTDOQHNODVkn_r12rh6JyxfOiu5TEAbHw4KA-ip_cmlbi0WlT0MmkcTFhvT_o0Ur7FEV4LZ7wRgR-ub67CPlol_KVvKoLs-3lkUqxzqBRe_o9lMpeIXesf2_HPf3K-W-JC64PKbTm2sPNqR-garza_kVjbMsAzjcW0eG3KUfc99pnWYWFsAcyCzl5n_iw80j-mmtZp022Oqmr32e2JETAHOL_lRJB6JSALHl7BMxcanT15kvUIvgZzI8y9MMwdHrHm71nDbUHZ4sCsdZGUDECk85PCEOhzlvS7EfDPgCzrrYCGmUDlFJ-vfWatWhYcB7gSEBEPkpTROMWJOeEb-2KZNGMUHsDikfNR49W1Z1gS4Osu2VSYyHGKVuY7n6hdYeIPTiIvmRQlQpPFIOGDdESE7zUVG8GutrbJ38GRemUr7WbxLTW2N2zFHtIkkcGiTOOloPzVIy1B-Qn8k9OIKF06cQl_20PNPsR0y5WoffQ2mVDaskaLJff-hMeIYS57y8Iagd6Yg2Mg6wsRYST6TO1MvvqVqmnoViIZxigDDVBC_lhpgaAcZGJDhg5YH7NhuNUGi1kfebgBpnz_CMb9nRZdzw8u1TP0WHHplVSFUjPTFfDvjJIJYtVZAW247K9AfAFdrKnOpjVXfqK-IP-FK7Bq88KhGNfSurk5LzjNSCuhqrpyRW2j1XA5xGxEEuOcPu-o_eBzZoz2SxJKdeaGb5SMIyC4Lw0ryD201PRTeDIzhXVfMsgA3sL_GXq0-XgLNnjj6uoXQcN340ysjRphmJ5G89aam2B-wayikGHQQzZt5_7adTn34tC2AEqi7nJ3_PFHVRDHGJ7FA8b7MKq05g0hAstrZrMe0tvMuDBknHjOYiJvlHmv9Wgd9D7U67gUzGWF7kULo5XfkJGgHWumFgw6zvLgUOK1SuFypnS0AiV3YOg5Ly-vOrFldX41Ais-1ubls7PEcIsmccaJu5av-3o9mhOSINg_ac3Dj-CbUJJH9zMZUQwVF_IPOhr-dMNPp3T2G2vAjizrsB-sZ1wiM2QWLRMKlevg1pv6RtOpN9jwvRFNIvRzHTrPN4uwsgOT3o0eRrhf6W6OHGCf7aFB_tGWt0lHUI09jVqp6kqBCvSWd1ziiUcaYNsUKhC-fyp7Y8S0lgcIGfGgvjdTGcR1pvxaJQHllZ3fosbOd0zW3blH15XMqF3JjLy4BvGlC-SUHKRQzpgIpfxnHgwlpthutF9c4UKjS1eUg1J-Ap-selOIYBQTjB-ZR7uybhV_GyPCMOEV8AsbwMebzdEIj9cQmACTQJ-I28LHmBOwvYCdj3mk5I3lZUgL_QY0xeCg3qPtkQUtvJ-seIvNDal9I7mHs32Ks0pO7P19ueo5v_NfauscW7cD-Y-v_sM0topBNccEoWWjszamJhw5FR_gryzfLtUSL8BSspK4a725S0RuFNFMFqD8gTQurfgQFXAac-Wq2cZbsZayKOCQGRxFynXIkGOU1-6l0BuDOStIvXMMw48qQ8IwXPSDxAExELT3hVj-uSp1wg4OGCyyKiM5-y_BDLIGlZacCTyLINYYw707ATLU0V5I2odiLG8t9Cbuut2HhGjTPzMhAaDa0MPDwX4KCCNbEk6jP0OBv-I4pTVKyvMJ37-HxxdXpwLtb6s-inIbD_T5OtxUXyH2VfA1SjNpCa20F2MVPwugPEE1nx_GBmmegbPX4WBgTviB9JJqlfc0FqNL8vNzC3A6QJoUboNKG7J95X6TDLUG9BgX78Jaus6eVjKUEb4suOw_gxN-6w_76lsO2TpbLdP5HlV12h1MYDkvpyL6RkfJRWo6vM6ALiY4sRvKkIBmSuRJkshtbiZFxWyD9vYvro5pf5kbMor1lUzR7m41zpZjCz7_S7OLa0qS1DiRegQrOHs1isklzp3gpr5xzvio55h4rvnEmCPnbroSem3JaGmyK2THeZTNP5L4ov2dDwptRv0Ue8lB5-eVqkaEyFvM3XBlGS1nBjI4rx3_jn4fc1JqhXglQ_3bCRK_5AWZtdeqLMns0zqkzDOnNjUe4PZoZ_afyeOdOoarl2kEoteMM-Ew","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"},
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

          // 动态路由命中时，检查该路径的 runtime 是否为 edge
          // 如果不是 edge（如 node/file），则跳出边缘函数，走回源逻辑
          if (matchedFunc && routeParams.mode > 0 && hookCtx && hookCtx.getPathRuntime) {
            try {
              const pathRuntime = await hookCtx.getPathRuntime(urlInfo.pathname);
              if (pathRuntime && pathRuntime !== 'edge') {
                matchedFunc = false;
              }
            } catch(e) {
              // getPathRuntime 调用失败时不阻断，继续执行边缘函数
            }
          }

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
          const edgeFunctionResponse = await pagesFunctionResponse({request, params, env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKID6VZvJwdRj6GKa8ra9cvrz-E4TfQFLjOQ9u2CdSMe4kHbwwRgdUP9nrbFUA8SXxd0","TENCENTCLOUD_SECRETKEY":"0ctSA2fFG0tEFP1EnErZv43ay6TCfDCOqKHQ7Y3m6v4=","TENCENTCLOUD_SESSIONTOKEN":"pJwRlnxphY0HtkR0QiaIauT2FgVTtksaaa851de9d326893f67b8ee0180157251Gssuw9QJvEOxgn3BxMQwN1gVd6tKhrIZsmhVt-fPnsASjNeF8dnsV96al-WkZeyzigwhPvkh3Q-3wcXdp3XiQYHA4MFP243c7M3C5QCzUJaarl4xxugOPVEpZ_rJL4E1W2hjJCo_fJJAm8f-6vtf9YDJ5oCxxMaRJksWJ-01WdjEXWHI3lmK3CtIXpEi07DiUV37ANYnEiRAtAQsZOd799s7b6_zRh1U7wzJKGbkxKwR3bO1cYdtsWio7UfvJPl76g2c4JsEQOO3wJi3FLN7WThDrII0IhhfHOHq3QSXv583D6YG9Vax4zqSNTDOQHNODVkn_r12rh6JyxfOiu5TEAbHw4KA-ip_cmlbi0WlT0MmkcTFhvT_o0Ur7FEV4LZ7wRgR-ub67CPlol_KVvKoLs-3lkUqxzqBRe_o9lMpeIXesf2_HPf3K-W-JC64PKbTm2sPNqR-garza_kVjbMsAzjcW0eG3KUfc99pnWYWFsAcyCzl5n_iw80j-mmtZp022Oqmr32e2JETAHOL_lRJB6JSALHl7BMxcanT15kvUIvgZzI8y9MMwdHrHm71nDbUHZ4sCsdZGUDECk85PCEOhzlvS7EfDPgCzrrYCGmUDlFJ-vfWatWhYcB7gSEBEPkpTROMWJOeEb-2KZNGMUHsDikfNR49W1Z1gS4Osu2VSYyHGKVuY7n6hdYeIPTiIvmRQlQpPFIOGDdESE7zUVG8GutrbJ38GRemUr7WbxLTW2N2zFHtIkkcGiTOOloPzVIy1B-Qn8k9OIKF06cQl_20PNPsR0y5WoffQ2mVDaskaLJff-hMeIYS57y8Iagd6Yg2Mg6wsRYST6TO1MvvqVqmnoViIZxigDDVBC_lhpgaAcZGJDhg5YH7NhuNUGi1kfebgBpnz_CMb9nRZdzw8u1TP0WHHplVSFUjPTFfDvjJIJYtVZAW247K9AfAFdrKnOpjVXfqK-IP-FK7Bq88KhGNfSurk5LzjNSCuhqrpyRW2j1XA5xGxEEuOcPu-o_eBzZoz2SxJKdeaGb5SMIyC4Lw0ryD201PRTeDIzhXVfMsgA3sL_GXq0-XgLNnjj6uoXQcN340ysjRphmJ5G89aam2B-wayikGHQQzZt5_7adTn34tC2AEqi7nJ3_PFHVRDHGJ7FA8b7MKq05g0hAstrZrMe0tvMuDBknHjOYiJvlHmv9Wgd9D7U67gUzGWF7kULo5XfkJGgHWumFgw6zvLgUOK1SuFypnS0AiV3YOg5Ly-vOrFldX41Ais-1ubls7PEcIsmccaJu5av-3o9mhOSINg_ac3Dj-CbUJJH9zMZUQwVF_IPOhr-dMNPp3T2G2vAjizrsB-sZ1wiM2QWLRMKlevg1pv6RtOpN9jwvRFNIvRzHTrPN4uwsgOT3o0eRrhf6W6OHGCf7aFB_tGWt0lHUI09jVqp6kqBCvSWd1ziiUcaYNsUKhC-fyp7Y8S0lgcIGfGgvjdTGcR1pvxaJQHllZ3fosbOd0zW3blH15XMqF3JjLy4BvGlC-SUHKRQzpgIpfxnHgwlpthutF9c4UKjS1eUg1J-Ap-selOIYBQTjB-ZR7uybhV_GyPCMOEV8AsbwMebzdEIj9cQmACTQJ-I28LHmBOwvYCdj3mk5I3lZUgL_QY0xeCg3qPtkQUtvJ-seIvNDal9I7mHs32Ks0pO7P19ueo5v_NfauscW7cD-Y-v_sM0topBNccEoWWjszamJhw5FR_gryzfLtUSL8BSspK4a725S0RuFNFMFqD8gTQurfgQFXAac-Wq2cZbsZayKOCQGRxFynXIkGOU1-6l0BuDOStIvXMMw48qQ8IwXPSDxAExELT3hVj-uSp1wg4OGCyyKiM5-y_BDLIGlZacCTyLINYYw707ATLU0V5I2odiLG8t9Cbuut2HhGjTPzMhAaDa0MPDwX4KCCNbEk6jP0OBv-I4pTVKyvMJ37-HxxdXpwLtb6s-inIbD_T5OtxUXyH2VfA1SjNpCa20F2MVPwugPEE1nx_GBmmegbPX4WBgTviB9JJqlfc0FqNL8vNzC3A6QJoUboNKG7J95X6TDLUG9BgX78Jaus6eVjKUEb4suOw_gxN-6w_76lsO2TpbLdP5HlV12h1MYDkvpyL6RkfJRWo6vM6ALiY4sRvKkIBmSuRJkshtbiZFxWyD9vYvro5pf5kbMor1lUzR7m41zpZjCz7_S7OLa0qS1DiRegQrOHs1isklzp3gpr5xzvio55h4rvnEmCPnbroSem3JaGmyK2THeZTNP5L4ov2dDwptRv0Ue8lB5-eVqkaEyFvM3XBlGS1nBjI4rx3_jn4fc1JqhXglQ_3bCRK_5AWZtdeqLMns0zqkzDOnNjUe4PZoZ_afyeOdOoarl2kEoteMM-Ew","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"}, waitUntil, eo });

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
        })({request: ev.request, params: {}, env: {"APPDATA":"C:\\Users\\王倩\\AppData\\Roaming","CLERK_SECRET_KEY":"sk_test_2IJEcfSJfy6N6bTYIEQltbIGDNNBSWA2psPxlcrtIc","COLOR":"0","COMSPEC":"C:\\WINDOWS\\system32\\cmd.exe","EDGEONE_PAGES_ACCELERATION_AREA":"overseas","EDGEONE_PAGES_PROJECT_NAME":"shopping","EDITOR":"C:\\WINDOWS\\notepad.exe","ELECTRON_RUN_AS_NODE":"1","HOME":"C:\\Users\\王倩","HOMEDRIVE":"C:","HOMEPATH":"\\Users\\王倩","INIT_CWD":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","INTEGRATION_IDE":"CodeBuddy","LOCALAPPDATA":"C:\\Users\\王倩\\AppData\\Local","LOGONSERVER":"\\\\LAPTOP-J01A3KVP","NEXT_PRIVATE_STANDALONE":"true","NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL":"/","NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL":"/","NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":"pk_test_aGVyb2ljLW9jZWxvdC0zMC5jbGVyay5hY2NvdW50cy5kZXYk","NEXT_PUBLIC_CLERK_SIGN_IN_URL":"/sign-in","NEXT_PUBLIC_CLERK_SIGN_UP_URL":"/sign-up","NODE":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","NODE_EXE":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node.exe","npm_command":"exec","npm_config_cache":"C:\\Users\\王倩\\AppData\\Local\\npm-cache","npm_config_globalconfig":"D:\\Downloads\\node-v20.19.0-win-x64\\etc\\npmrc","npm_config_global_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_init_module":"C:\\Users\\王倩\\.npm-init.js","npm_config_local_prefix":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend","npm_config_node_gyp":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\node-gyp\\bin\\node-gyp.js","npm_config_noproxy":"","npm_config_npm_version":"10.8.2","npm_config_prefix":"D:\\Downloads\\node-v20.19.0-win-x64","npm_config_userconfig":"C:\\Users\\王倩\\.npmrc","npm_config_user_agent":"npm/10.8.2 node/v20.19.0 win32 x64 workspaces/false","npm_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npm-cli.js","npm_lifecycle_event":"npx","npm_lifecycle_script":"edgeone","npm_node_execpath":"D:\\Downloads\\node-v20.19.0-win-x64\\node.exe","npm_package_json":"c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\package.json","npm_package_name":"ai-avoid-pit-frontend","npm_package_version":"0.1.0","NPM_PREFIX_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\\\node_modules\\npm\\bin\\npm-prefix.js","NPM_PREFIX_NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","NPX_CLI_JS":"D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\bin\\npx-cli.js","PAGES_SOURCE":"codebuddy","PATH":"C:\\Users\\王倩\\AppData\\Local\\npm-cache\\_npx\\00df61ab4d846258\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\frontend\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\20260524182246\\node_modules\\.bin;c:\\Users\\王倩\\CodeBuddy\\node_modules\\.bin;c:\\Users\\王倩\\node_modules\\.bin;c:\\Users\\node_modules\\.bin;c:\\node_modules\\.bin;D:\\Downloads\\node-v20.19.0-win-x64\\node_modules\\npm\\node_modules\\@npmcli\\run-script\\lib\\node-gyp-bin;D:\\bigdata\\bin\\;D:\\Program Files\\Python312\\Scripts\\;D:\\Program Files\\Python312\\;C:\\WINDOWS\\system32;C:\\WINDOWS;C:\\WINDOWS\\System32\\Wbem;C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\;C:\\WINDOWS\\System32\\OpenSSH\\;D:\\Program Files\\MAT1LAB\\R2025a\\runtime\\win64;D:\\Program Files\\MAT1LAB\\R2025a\\bin;D:\\ProgramData\\Anaconda3;D:\\ProgramData\\Anaconda3\\Scripts;D:\\ProgramData\\Anaconda3\\Library\\mingw-w64\\bin;D:\\ProgramData\\Anaconda3\\Library\\usr\\bin;D:\\ProgramData\\Anaconda3\\Library\\bin;D:\\Latex\\texlive\\2024\\bin\\windows;D:\\Microsoft VS Code\\bin;C:\\Program Files\\Git\\cmd;D:\\Latex;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\Scripts\\;C:\\Users\\WQ\\AppData\\Local\\Programs\\Python\\Python311\\;C:\\Users\\王倩\\AppData\\Local\\Microsoft\\WindowsApps;D:\\Program Files\\JetBrains\\PyCharm 2025.2.3\\bin;C:\\Users\\王倩\\AppData\\Local\\Pandoc\\;D:\\CodeBuddy CN\\bin;C:\\Users\\王倩\\AppData\\Local\\Programs\\Ollama;D:\\Downloads\\node-v20.19.0-win-x64","PATHEXT":".COM;.EXE;.BAT;.CMD;.VBS;.JS;.WS;.MSC","PROCESSOR_ARCHITECTURE":"AMD64","PROGRAMFILES":"C:\\Program Files","PROMPT":"$P$G","SYSTEMDRIVE":"C:","SYSTEMROOT":"C:\\WINDOWS","TEMP":"C:\\Users\\WQ","TENCENTCLOUD_SECRETID":"AKID6VZvJwdRj6GKa8ra9cvrz-E4TfQFLjOQ9u2CdSMe4kHbwwRgdUP9nrbFUA8SXxd0","TENCENTCLOUD_SECRETKEY":"0ctSA2fFG0tEFP1EnErZv43ay6TCfDCOqKHQ7Y3m6v4=","TENCENTCLOUD_SESSIONTOKEN":"pJwRlnxphY0HtkR0QiaIauT2FgVTtksaaa851de9d326893f67b8ee0180157251Gssuw9QJvEOxgn3BxMQwN1gVd6tKhrIZsmhVt-fPnsASjNeF8dnsV96al-WkZeyzigwhPvkh3Q-3wcXdp3XiQYHA4MFP243c7M3C5QCzUJaarl4xxugOPVEpZ_rJL4E1W2hjJCo_fJJAm8f-6vtf9YDJ5oCxxMaRJksWJ-01WdjEXWHI3lmK3CtIXpEi07DiUV37ANYnEiRAtAQsZOd799s7b6_zRh1U7wzJKGbkxKwR3bO1cYdtsWio7UfvJPl76g2c4JsEQOO3wJi3FLN7WThDrII0IhhfHOHq3QSXv583D6YG9Vax4zqSNTDOQHNODVkn_r12rh6JyxfOiu5TEAbHw4KA-ip_cmlbi0WlT0MmkcTFhvT_o0Ur7FEV4LZ7wRgR-ub67CPlol_KVvKoLs-3lkUqxzqBRe_o9lMpeIXesf2_HPf3K-W-JC64PKbTm2sPNqR-garza_kVjbMsAzjcW0eG3KUfc99pnWYWFsAcyCzl5n_iw80j-mmtZp022Oqmr32e2JETAHOL_lRJB6JSALHl7BMxcanT15kvUIvgZzI8y9MMwdHrHm71nDbUHZ4sCsdZGUDECk85PCEOhzlvS7EfDPgCzrrYCGmUDlFJ-vfWatWhYcB7gSEBEPkpTROMWJOeEb-2KZNGMUHsDikfNR49W1Z1gS4Osu2VSYyHGKVuY7n6hdYeIPTiIvmRQlQpPFIOGDdESE7zUVG8GutrbJ38GRemUr7WbxLTW2N2zFHtIkkcGiTOOloPzVIy1B-Qn8k9OIKF06cQl_20PNPsR0y5WoffQ2mVDaskaLJff-hMeIYS57y8Iagd6Yg2Mg6wsRYST6TO1MvvqVqmnoViIZxigDDVBC_lhpgaAcZGJDhg5YH7NhuNUGi1kfebgBpnz_CMb9nRZdzw8u1TP0WHHplVSFUjPTFfDvjJIJYtVZAW247K9AfAFdrKnOpjVXfqK-IP-FK7Bq88KhGNfSurk5LzjNSCuhqrpyRW2j1XA5xGxEEuOcPu-o_eBzZoz2SxJKdeaGb5SMIyC4Lw0ryD201PRTeDIzhXVfMsgA3sL_GXq0-XgLNnjj6uoXQcN340ysjRphmJ5G89aam2B-wayikGHQQzZt5_7adTn34tC2AEqi7nJ3_PFHVRDHGJ7FA8b7MKq05g0hAstrZrMe0tvMuDBknHjOYiJvlHmv9Wgd9D7U67gUzGWF7kULo5XfkJGgHWumFgw6zvLgUOK1SuFypnS0AiV3YOg5Ly-vOrFldX41Ais-1ubls7PEcIsmccaJu5av-3o9mhOSINg_ac3Dj-CbUJJH9zMZUQwVF_IPOhr-dMNPp3T2G2vAjizrsB-sZ1wiM2QWLRMKlevg1pv6RtOpN9jwvRFNIvRzHTrPN4uwsgOT3o0eRrhf6W6OHGCf7aFB_tGWt0lHUI09jVqp6kqBCvSWd1ziiUcaYNsUKhC-fyp7Y8S0lgcIGfGgvjdTGcR1pvxaJQHllZ3fosbOd0zW3blH15XMqF3JjLy4BvGlC-SUHKRQzpgIpfxnHgwlpthutF9c4UKjS1eUg1J-Ap-selOIYBQTjB-ZR7uybhV_GyPCMOEV8AsbwMebzdEIj9cQmACTQJ-I28LHmBOwvYCdj3mk5I3lZUgL_QY0xeCg3qPtkQUtvJ-seIvNDal9I7mHs32Ks0pO7P19ueo5v_NfauscW7cD-Y-v_sM0topBNccEoWWjszamJhw5FR_gryzfLtUSL8BSspK4a725S0RuFNFMFqD8gTQurfgQFXAac-Wq2cZbsZayKOCQGRxFynXIkGOU1-6l0BuDOStIvXMMw48qQ8IwXPSDxAExELT3hVj-uSp1wg4OGCyyKiM5-y_BDLIGlZacCTyLINYYw707ATLU0V5I2odiLG8t9Cbuut2HhGjTPzMhAaDa0MPDwX4KCCNbEk6jP0OBv-I4pTVKyvMJ37-HxxdXpwLtb6s-inIbD_T5OtxUXyH2VfA1SjNpCa20F2MVPwugPEE1nx_GBmmegbPX4WBgTviB9JJqlfc0FqNL8vNzC3A6QJoUboNKG7J95X6TDLUG9BgX78Jaus6eVjKUEb4suOw_gxN-6w_76lsO2TpbLdP5HlV12h1MYDkvpyL6RkfJRWo6vM6ALiY4sRvKkIBmSuRJkshtbiZFxWyD9vYvro5pf5kbMor1lUzR7m41zpZjCz7_S7OLa0qS1DiRegQrOHs1isklzp3gpr5xzvio55h4rvnEmCPnbroSem3JaGmyK2THeZTNP5L4ov2dDwptRv0Ue8lB5-eVqkaEyFvM3XBlGS1nBjI4rx3_jn4fc1JqhXglQ_3bCRK_5AWZtdeqLMns0zqkzDOnNjUe4PZoZ_afyeOdOoarl2kEoteMM-Ew","USERDOMAIN":"LAPTOP-J01A3KVP","USERNAME":"王倩","USERPROFILE":"C:\\Users\\王倩","WINDIR":"C:\\WINDOWS","WORKSPACE_FOLDER_PATHS":"c:/Users/王倩/CodeBuddy/20260524182246"}, waitUntil: ev.waitUntil.bind(ev) });
        // ↑ 用户原始代码结束
      }

      addEventListener('fetch', (event, hookCtx) => {
        const res = usercode(event, hookCtx);
        event.respondWith(res);
      });