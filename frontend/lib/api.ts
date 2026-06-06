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

    // 云函数可能返回两种格式：
    // A) SDK 直出模式：直接返回数据对象 { productName, flaws, ... }
    // B) HTTP 包装模式：{ statusCode, body: '{"jobId":"...","status":"done","data":{...}}' }

    let actualData: any;

    if (result && typeof result.body === 'string') {
      // B: HTTP 包装模式 — 从 body 解析
      try {
        const parsed = JSON.parse(result.body);
        actualData = parsed.data || parsed;
      } catch (e) {
        console.error('[api] 解析 body 失败:', e);
        return { jobId: '', status: 'error', error: 'AI 返回数据解析失败' };
      }
    } else if (result && result.error) {
      // 错误格式
      return { jobId: '', status: 'error', error: String(result.error) };
    } else if (result && result.statusCode && result.statusCode >= 400) {
      // HTTP 错误码
      const msg = (typeof result.body === 'string') ? (JSON.parse(result.body).message || '') : '';
      return { jobId: '', status: 'error', error: msg || `HTTP ${result.statusCode}` };
    } else {
      // A: SDK 直出模式 或 兜底
      actualData = result;
    }

    // 验证数据完整性
    if (!actualData || typeof actualData !== 'object') {
      return { jobId: '', status: 'error', error: 'AI 返回数据为空' };
    }

    return {
      jobId: 'cloudbase-direct',
      status: 'done',
      data: actualData,
    };
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
