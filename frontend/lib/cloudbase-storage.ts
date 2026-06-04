/**
 * CloudBase 云端存储层 —— 用户数据的跨设备同步
 * 不改变 AI 服务、不改变 UI 组件，只给 localStorage 加云端同步
 */

import cloudbase from '@cloudbase/js-sdk';

const ENV_ID = 'pit-avoidance-d3gx1xj3j622007d9';
const REGION = 'ap-shanghai';
const ACCESS_KEY = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjlkMWRjMzFlLWI0ZDAtNDQ4Yi1hNzZmLWIwY2M2M2Q4MTQ5OCJ9.eyJpc3MiOiJodHRwczovL3BpdC1hdm9pZGFuY2UtZDNneDF4ajNqNjIyMDA3ZDkuYXAtc2hhbmdoYWkudGNiLWFwaS50ZW5jZW50Y2xvdWRhcGkuY29tIiwic3ViIjoiYW5vbiIsImF1ZCI6InBpdC1hdm9pZGFuY2UtZDNneDF4ajNqNjIyMDA3ZDkiLCJleHAiOjQwODQyMzEzNDUsImlhdCI6MTc4MDU0ODE0NSwibm9uY2UiOiJuTTRMekNCeFM0dWpRNnRGcHlobXhnIiwiYXRfaGFzaCI6Im5NNEx6Q0J4UzR1alE2dEZweWhteGciLCJuYW1lIjoiQW5vbnltb3VzIiwic2NvcGUiOiJhbm9ueW1vdXMiLCJwcm9qZWN0X2lkIjoicGl0LWF2b2lkYW5jZS1kM2d4MXhqM2o2MjIwMDdkOSIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJ1c2VyX3R5cGUiOiIiLCJjbGllbnRfdHlwZSI6ImNsaWVudF91c2VyIiwiaXNfc3lzdGVtX2FkbWluIjpmYWxzZX0.LBy4hSkVbjSXgC78WpFl11fSOQQ98mEk7hWTHmAISH7GxRauBCp72gQK7MTgy9H-FOf9uQ4qxvw2FR9a2j_m_15YrEgiwAi05sPYIL0ikyapQURswWrfS0qpMZwEIfWPzgaTd6-B1ZkscyumzoK9Mia5q_DENz_4TduyUNZMnp9toqUVIV_qsyNktsW3STQmuUATzZG4JPOXuah1Xn0FvREQ5tV63XqSQr64VtqZgBuVgyAPQIvDu7FUjFK5qocX0sryWlREYZmyfK6zT9uVGkYyoda8m26dCweLYwHdY60VkkR3dopbrrGzFbTdx3Ibh67DuWHSUq0TKLV2bVglPA';

// ============================================
// SDK 单例
// ============================================
let app: ReturnType<typeof cloudbase.init> | null = null;
let db: any = null;
let ready = false;
let initPromise: Promise<boolean> | null = null;

function getApp() {
  if (!app) {
    app = cloudbase.init({ env: ENV_ID, region: REGION, accessKey: ACCESS_KEY });
  }
  return app;
}

function getDb() {
  if (!db) db = getApp().database();
  return db;
}

/**
 * 初始化 CloudBase（匿名登录）
 * 失败不影响本地功能，仅禁用云端同步
 */
export async function initCloudBase(): Promise<boolean> {
  if (ready) return true;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      const auth = getApp().auth({ persistence: 'local' });
      const { data } = await auth.getSession();
      if (!data?.session) await auth.signInAnonymously();
      ready = true;
      console.log('[CloudBase] 存储层已就绪');
      return true;
    } catch (e) {
      console.warn('[CloudBase] 存储层初始化失败，仅使用本地存储:', e);
      ready = false;
      return false;
    }
  })();
  
  return initPromise;
}

export function isCloudReady(): boolean {
  return ready;
}

// ============================================
// 用户资料同步
// ============================================
export async function saveUserProfile(user: {
  username: string;
  passwordHash: string;
  nickname: string;
  avatar: string;
  createdAt: number;
  xp: number;
  level: number;
}): Promise<void> {
  if (!ready) return;
  try {
    const _key = user.username.toLowerCase();
    const collection = getDb().collection('users');
    const existing = await collection.where({ _key }).limit(1).get();
    if (existing.data?.length > 0) {
      await collection.doc(existing.data[0]._id).update({
        passwordHash: user.passwordHash,
        nickname: user.nickname,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        updatedAt: Date.now(),
      });
    } else {
      await collection.add({ _key, ...user, updatedAt: Date.now() });
    }
  } catch (e) {
    console.warn('[CloudBase] 保存用户资料失败:', e);
  }
}

export async function loadUserProfile(username: string): Promise<{
  passwordHash: string;
  username: string;
  nickname: string;
  avatar: string;
  createdAt: number;
  xp: number;
  level: number;
} | null> {
  if (!ready) return null;
  try {
    const _key = username.toLowerCase();
    const res = await getDb().collection('users').where({ _key }).limit(1).get();
    if (res.data?.length > 0) {
      const { _id, _key: _, _openid: __, updatedAt: ___, ...profile } = res.data[0];
      return profile;
    }
  } catch (e) {
    console.warn('[CloudBase] 加载用户资料失败:', e);
  }
  return null;
}

// ============================================
// 搜索历史同步
// ============================================
export async function saveSearchHistory(userId: string, items: { query: string; timestamp: number }[]): Promise<void> {
  if (!ready || !userId) return;
  try {
    await getDb().collection('user_history').add({
      userId: userId.toLowerCase(),
      items,
      updatedAt: Date.now(),
    });
  } catch (e) {
    // First save fails if creating doc, try update
    try {
      const res = await getDb().collection('user_history').where({ userId: userId.toLowerCase() }).limit(1).get();
      if (res.data?.length > 0) {
        await getDb().collection('user_history').doc(res.data[0]._id).update({ items, updatedAt: Date.now() });
      }
    } catch (e2) {
      console.warn('[CloudBase] 保存搜索历史失败:', e2);
    }
  }
}

export async function loadSearchHistory(userId: string): Promise<{ query: string; timestamp: number }[] | null> {
  if (!ready || !userId) return null;
  try {
    const res = await getDb().collection('user_history').where({ userId: userId.toLowerCase() }).limit(1).get();
    if (res.data?.length > 0) return res.data[0].items || [];
  } catch (e) {
    console.warn('[CloudBase] 加载搜索历史失败:', e);
  }
  return null;
}

// ============================================
// 收藏同步
// ============================================
export async function saveBookmarks(userId: string, items: any[]): Promise<void> {
  if (!ready || !userId) return;
  try {
    const res = await getDb().collection('user_bookmarks').where({ userId: userId.toLowerCase() }).limit(1).get();
    if (res.data?.length > 0) {
      await getDb().collection('user_bookmarks').doc(res.data[0]._id).update({ items, updatedAt: Date.now() });
    } else {
      await getDb().collection('user_bookmarks').add({
        userId: userId.toLowerCase(),
        items,
        updatedAt: Date.now(),
      });
    }
  } catch (e) {
    console.warn('[CloudBase] 保存收藏失败:', e);
  }
}

export async function loadBookmarks(userId: string): Promise<any[] | null> {
  if (!ready || !userId) return null;
  try {
    const res = await getDb().collection('user_bookmarks').where({ userId: userId.toLowerCase() }).limit(1).get();
    if (res.data?.length > 0) return res.data[0].items || [];
  } catch (e) {
    console.warn('[CloudBase] 加载收藏失败:', e);
  }
  return null;
}
