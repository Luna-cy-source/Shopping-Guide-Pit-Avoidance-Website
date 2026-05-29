/**
 * ============================================
 * 图片代理缓存模块
 * 
 * 策略：懒加载 + R2 持久化缓存
 * - 首次请求：从外网下载 → 存入 R2 → 返回
 * - 后续请求：直接从 R2 返回（带长期 Cache-Control）
 * ============================================
 */

import type { R2Bucket } from '@cloudflare/workers-types';

/** R2 key 前缀，隔离缓存文件 */
const CACHE_PREFIX = 'img/';

/** 最大缓存体积 5 MB */
const MAX_SIZE = 5 * 1024 * 1024;

/** 不进行缓存的域名或路径关键词（黑名单） */
const CACHE_BLACKLIST = ['placeholder', 'no-image', 'default'];

// ============================================
// 工具：URL → 确定性 R2 key (SHA-256)
// ============================================
export async function urlToCacheKey(url: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(url));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${CACHE_PREFIX}${hex.substring(0, 48)}`;
}

// ============================================
// 判断该 URL 是否应该走缓存
// ============================================
function shouldCache(url: string): boolean {
  try {
    const lower = url.toLowerCase();
    if (!lower.startsWith('https://') && !lower.startsWith('http://')) return false;
    for (const kw of CACHE_BLACKLIST) {
      if (lower.includes(kw)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================
// 获取或下载图片（R2 优先）
// 返回 body, contentType, cacheControl 供直接构造 Response
// ============================================
export async function getOrDownloadImage(
  bucket: R2Bucket,
  imageUrl: string,
): Promise<{
  body: ReadableStream | null;
  contentType: string;
  cacheControl: string;
  status: number;
} | null> {
  // ---- 黑名单检查 ----
  if (!shouldCache(imageUrl)) {
    return null;
  }

  const key = await urlToCacheKey(imageUrl);

  // ---- 优先读 R2 缓存 ----
  try {
    const cached = await bucket.get(key);
    if (cached && cached.body) {
      return {
        body: cached.body,
        contentType: cached.httpMetadata?.contentType || 'image/jpeg',
        cacheControl: 'public, max-age=604800, immutable',
        status: 200,
      };
    }
  } catch (err) {
    console.error('[图片缓存] R2 读取失败，降级直连:', err);
  }

  // ---- 缓存未命中：从外网下载 ----
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 秒超时

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AiAvoidPit/1.0 (Image Proxy Cache)',
      },
      // @ts-expect-error cf 是 Workers 专有字段
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    clearTimeout(timeout);

    if (!response.ok || !response.body) {
      console.warn(`[图片缓存] 外网下载失败 HTTP ${response.status}: ${imageUrl}`);
      return null;
    }

    const contentType =
      response.headers.get('content-type') || 'image/jpeg';
    const contentLengthHeader = response.headers.get('content-length');
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : null;

    // 超限的图片不缓存，直接透传
    if (contentLength !== null && contentLength > MAX_SIZE) {
      return {
        body: response.body,
        contentType,
        cacheControl: 'public, max-age=3600',
        status: 200,
      };
    }

    // ---- 并行：返回给用户 + 存入 R2 ----
    // 用两个 ReadableStream tee 分流
    const [userStream, cacheStream] = response.body.tee();

    // 异步写入 R2（不阻塞用户响应）
    cacheToR2(bucket, key, cacheStream, contentType, imageUrl).catch((err) => {
      console.error('[图片缓存] R2 后台写入失败:', err);
    });

    return {
      body: userStream,
      contentType,
      cacheControl: 'public, max-age=604800',
      status: 200,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[图片缓存] 下载异常 (${msg}): ${imageUrl}`);
    return null;
  }
}

// ============================================
// 后台异步：将流写入 R2
// ============================================
async function cacheToR2(
  bucket: R2Bucket,
  key: string,
  stream: ReadableStream,
  contentType: string,
  originalUrl: string,
): Promise<void> {
  try {
    // 收集完整的 ArrayBuffer（R2 put 需要完整内容）
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalSize += value.byteLength;
      if (totalSize > MAX_SIZE) {
        reader.cancel();
        return; // 超限放弃缓存
      }
      chunks.push(value);
    }

    // 合并 chunks
    const buffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    await bucket.put(key, buffer, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=604800',
      },
      customMetadata: {
        originalUrl,
        cachedAt: Date.now().toString(),
      },
    });

    console.log(`[图片缓存] ✓ 已缓存: ${originalUrl.substring(0, 60)}...`);
  } catch (err) {
    // 静默失败：后台缓存是可选的增强
    console.warn('[图片缓存] 后台写入异常:', err);
  }
}

// ============================================
// 主动预热：下载并缓存指定 URL 的图片
// 返回 R2 key，失败返回 null
// ============================================
export async function downloadAndCacheImage(
  bucket: R2Bucket,
  imageUrl: string,
): Promise<string | null> {
  if (!shouldCache(imageUrl)) return null;

  const key = await urlToCacheKey(imageUrl);

  // 如果已缓存，直接返回 key
  try {
    const existing = await bucket.head(key);
    if (existing) return key;
  } catch {
    // head 失败忽略，继续下载
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AiAvoidPit/1.0 (Image Cache Prewarm)' },
    });

    clearTimeout(timeout);

    if (!response.ok || !response.body) return null;

    const contentType =
      response.headers.get('content-type') || 'image/jpeg';

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) return null;

    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType,
        cacheControl: 'public, max-age=604800',
      },
      customMetadata: {
        originalUrl: imageUrl,
        cachedAt: Date.now().toString(),
      },
    });

    console.log(`[图片缓存] ✓ 预热完成: ${imageUrl.substring(0, 60)}...`);
    return key;
  } catch (err) {
    console.warn('[图片缓存] 预热失败:', err);
    return null;
  }
}
