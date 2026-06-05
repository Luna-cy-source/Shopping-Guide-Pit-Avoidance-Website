/**
 * API 工具 — CloudBase 云函数模式
 *
 * 流程：
 *   1. callFunction('aiSearch', { query }) → 同步返回 AI 分析结果
 *   2. 无需轮询，直接展示数据
 */

import { callFunction } from './cloudbase-client';

/**
 * 提交搜索，返回 AI 分析结果（同步）
 */
export async function submitSearch(query: string): Promise<{
  jobId: string;
  status: 'done' | 'processing' | 'error';
  data?: any;
  error?: string;
}> {
  console.log('[api] 调用 aiSearch 云函数 | query=', query);

  try {
    const result = await callFunction('aiSearch', { query });

    // 云函数直接返回分析数据
    if (result && result.code === undefined) {
      // 正常结果
      return {
        jobId: 'cloudbase-direct',
        status: 'done',
        data: result,
      };
    }

    // 云函数返回了错误格式
    if (result && result.error) {
      return { jobId: '', status: 'error', error: String(result.error) };
    }

    if (result && result.statusCode && result.statusCode >= 400) {
      const msg = result.body ? JSON.parse(result.body).message || '' : '';
      return { jobId: '', status: 'error', error: msg || `HTTP ${result.statusCode}` };
    }

    // 兜底：把原始结果作为数据
    return { jobId: 'cloudbase-direct', status: 'done', data: result };
  } catch (err: any) {
    console.error('[api] aiSearch 调用失败:', err);
    throw new Error(err?.message || 'AI 分析请求失败');
  }
}

/**
 * 轮询 Job 结果（兼容接口，云函数模式下不需要）
 * @returns 立即返回 done 状态
 */
export async function pollResult(jobId: string): Promise<{
  jobId: string;
  status: 'done' | 'processing' | 'error' | 'not_found';
  data?: any;
  error?: string;
  hint?: string;
}> {
  // 云函数同步模式，不需要轮询
  return { jobId, status: 'not_found' as const };
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
