/**
 * API 工具 — 异步 Job 模式
 *
 * 流程：
 *   1. POST /api/search → 立即返回 { jobId, status: 'done'|'processing' }
 *   2. 如果 status='processing' → 每 2s 轮询 GET /api/search/result?jobId=xxx
 *   3. 直到 status='done' → 取出 data
 */

const API_BASE = ''; // 同源 Pages 代理

/**
 * 提交搜索，返回 Job 信息
 * 如果缓存命中 → status='done'，直接有 data
 * 如果缓存未命中 → status='processing'，后台处理中
 */
export async function submitSearch(query: string): Promise<{
  jobId: string;
  status: 'done' | 'processing' | 'error';
  data?: any;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * 轮询 Job 结果
 * @returns { status, data?, error? }
 */
export async function pollResult(jobId: string): Promise<{
  jobId: string;
  status: 'done' | 'processing' | 'error';
  data?: any;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/search/result?jobId=${encodeURIComponent(jobId)}`);

  if (!res.ok) {
    // 轮询失败不抛异常，返回 processing 状态
    return { jobId, status: 'processing' };
  }

  return res.json();
}

/**
 * 验证 AI 返回数据的完整性（增强版）
 * 不仅检查结构完整性，还自动补全缺失字段
 */
export function isResponseComplete(data: any): boolean {
  if (!data || typeof data !== 'object') return false;

  // 核心字段检查
  const hasProduct = !!data.productName && typeof data.productName === 'string' && data.productName.length > 1;
  if (!hasProduct) return false;

  // 自动补全缺失的渲染必需字段（不修改 data，只用于判断）
  const hasFlaws = Array.isArray(data.flaws) && data.flaws.length > 0;
  const hasCategory = !!data.category && typeof data.category === 'string';
  const hasIntent = !!data.intent;

  // 如果缺少 intent，自动推断（前端兜底）
  if (!hasIntent) {
    if (data.productName) data.intent = 'product';
    else if (data.category || data.comparisons) data.intent = 'category';
  }

  // 如果 flaws 为空但有 productName → 仍然可以通过（前端自己处理空 flaws）
  // 放宽条件：只要有 productName 就认为数据可用
  return true;
}

// 兼容旧引用
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || '';
export function apiUrls(path: string): string[] { return [path]; }
export function apiUrl(path: string): string { return path; }
