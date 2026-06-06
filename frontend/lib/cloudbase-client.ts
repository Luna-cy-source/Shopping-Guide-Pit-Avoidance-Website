/**
 * CloudBase SDK 客户端 — 统一初始化入口
 * 所有认证、数据库操作都通过此模块获取实例
 */
import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'pit-avoidance-d3gx1xj3j622007d9';
const REGION = 'ap-shanghai';
const ACCESS_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3BpdC1hdm9pZGFuY2UtZDNneDF4ajNqNjIyMDA3ZDkuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InBpdC1hdm9pZGFuY2UtZDNneDF4ajNqNjIyMDA3ZDkiLCJleHAiOjQwODQyMzEzNDUsImlhdCI6MTc4MDU0ODE0NSwibm9uY2UiOiJuTTRMekNCeFM0dWpRNnRGcHlobXhnIiwiYXRfaGFzaCI6Im5NNEx6Q0J4UzR1alE2dEZweWhteGciLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoicGl0LWF2b2lkYW5jZS1kM2d4MXhqM2o2MjIwMDdkOSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.LBy4hSkVbjSXgC78WpFl11fSOQQ98mEk7hWTHmAISH7GxRauBCp72gQK7MTgy9H-FOf9uQ4qxvw2FR9a2j_m_15YrEgiwAi05sPYIL0ikyapQURswWrfS0qpMZwEIfWPzgaTd6-B1ZkscyumzoK9Mia5q_DENz_4TduyUNZMnp9toqUVIV_qsyNktsW3STQmuUATzZG4JPOXuah1Xn0FvREQ5tV63XqSQr64VtqZgBuVgyAPQIvDu7FUjFK5qocX0sryWlREYZmyfK6zT9uVGkYyoda8m26dCweLYwHdY60VkkR3dopbrrGzFbTdx3Ibh67DuWHSUq0TKLV2bVglPA';

// ============================================
// SDK 单例
// ============================================
let _app: ReturnType<typeof cloudbase.init> | null = null;
let _initError: Error | null = null;

/** 获取 CloudBase App 实例（单例），初始化失败时返回 null */
export function getApp() {
  if (_initError) return null; // 已知失败，不再重试
  if (!_app) {
    try {
      _app = cloudbase.init({
        env: ENV_ID,
        region: REGION,
        accessKey: ACCESS_KEY,
      });
    } catch (err: any) {
      _initError = err instanceof Error ? err : new Error(String(err));
      console.error('[CloudBase] SDK 初始化失败:', _initError.message);
      return null;
    }
  }
  return _app;
}

/** CloudBase SDK 是否可用 */
export function isSdkReady(): boolean {
  return !!_app && !_initError;
}

/** 获取认证模块（Supabase 风格 API），SDK 不可用时返回 null */
export function getAuth() {
  const app = getApp();
  if (!app) return null;
  return app.auth({ persistence: 'local' });
}

/** 获取 NoSQL 文档数据库实例，SDK 不可用时返回 null */
export function getDatabase() {
  const app = getApp();
  if (!app) return null;
  return app.database();
}

/** 调用云函数，SDK 不可用时抛出明确错误 */
export async function callFunction(name: string, data: Record<string, any>) {
  const app = getApp();
  if (!app) throw new Error('CloudBase SDK 未初始化，无法调用云函数');
  const res = await app.callFunction({ name, data });
  return res.result;
}

/** 环境信息 */
export { ENV_ID, REGION };
