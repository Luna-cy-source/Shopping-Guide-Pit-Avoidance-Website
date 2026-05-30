/**
 * API 工具 — 统一管理后端 Worker 地址
 * 生产环境通过 NEXT_PUBLIC_WORKER_URL 环境变量配置
 */
export const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || 'https://ai-avoid-pit.793309184.workers.dev';

export function apiUrl(path: string): string {
  return `${WORKER_URL}${path}`;
}
