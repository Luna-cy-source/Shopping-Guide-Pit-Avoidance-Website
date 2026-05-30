/**
 * API 工具 — 统一管理后端 Worker 地址
 *
 * 同源代理模式：
 *   - NEXT_PUBLIC_WORKER_URL 为空时，apiUrl 返回相对路径（如 /api/search）
 *   - 浏览器请求发送到 Pages 自身域名（同源）
 *   - Cloudflare _redirects 规则将 /api/* 透明代理到 Worker 后端
 *   - 优势：无跨域问题、无需自定义域名、自动走 Cloudflare 全球网络
 *
 * 直连模式（备用）：
 *   - 设置 NEXT_PUBLIC_WORKER_URL=https://your-worker.workers.dev
 *   - apiUrl 返回完整 URL，直接跨域调用 Worker
 */
export const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || '';

export function apiUrl(path: string): string {
  if (!WORKER_URL) {
    // 同源模式：返回相对路径，由 _redirects 代理到 Worker
    return path;
  }
  // 直连模式
  return `${WORKER_URL}${path}`;
}
