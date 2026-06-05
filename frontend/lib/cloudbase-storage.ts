/**
 * CloudBase 云端存储层 — 用户数据的跨设备同步
 *
 * 改造前：匿名登录 + 按 username 同步
 * 改造后：真实用户认证 + 按 uid 同步（跨设备数据一致）
 *
 * 数据流程：
 *   localStorage（快速读写，离线可用）
 *   ↓ 后台异步同步
 *   CloudBase NoSQL（跨设备恢复）
 */

import { getApp } from './cloudbase-client';

// ============================================
// SDK 单例（复用 cloudbase-client 的实例）
// ============================================
let db: any = null;
let ready = false;
let initPromise: Promise<boolean> | null = null;

function getDb() {
  if (!db) db = getApp().database();
  return db;
}

/**
 * 初始化 CloudBase 存储层
 * 使用已认证的 App 实例（不再匿名登录）
 */
export async function initCloudBase(): Promise<boolean> {
  if (ready) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // 测试数据库连接是否可用
      await getDb().collection('_test').limit(1).get();
      ready = true;
      console.log('[CloudBase] NoSQL 存储层已就绪');
      return true;
    } catch {
      console.warn('[CloudBase] NoSQL 存储层不可用，仅使用本地存储');
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
// 用户资料同步（NoSQL users 集合）
// ============================================
export async function saveUserProfile(user: {
  username: string;
  nickname: string;
  avatar: string;
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
  username: string;
  nickname: string;
  avatar: string;
  xp: number;
  level: number;
} | null> {
  if (!ready) return null;
  try {
    const res = await getDb().collection('users').where({ _key: username.toLowerCase() }).limit(1).get();
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
// 搜索历史同步（NoSQL user_history 集合）
// ============================================
export async function saveSearchHistory(userId: string, items: { query: string; timestamp: number }[]): Promise<void> {
  if (!ready || !userId) return;
  try {
    const collection = getDb().collection('user_history');
    const existing = await collection.where({ userId }).limit(1).get();
    if (existing.data?.length > 0) {
      await collection.doc(existing.data[0]._id).update({ items, updatedAt: Date.now() });
    } else {
      await collection.add({ userId, items, updatedAt: Date.now() });
    }
  } catch (e) {
    console.warn('[CloudBase] 保存搜索历史失败:', e);
  }
}

export async function loadSearchHistory(userId: string): Promise<{ query: string; timestamp: number }[] | null> {
  if (!ready || !userId) return null;
  try {
    const res = await getDb().collection('user_history').where({ userId }).limit(1).get();
    if (res.data?.length > 0) return res.data[0].items || [];
  } catch (e) {
    console.warn('[CloudBase] 加载搜索历史失败:', e);
  }
  return null;
}

// ============================================
// 收藏同步（NoSQL user_bookmarks 集合）
// ============================================
export async function saveBookmarks(userId: string, items: any[]): Promise<void> {
  if (!ready || !userId) return;
  try {
    const collection = getDb().collection('user_bookmarks');
    const existing = await collection.where({ userId }).limit(1).get();
    if (existing.data?.length > 0) {
      await collection.doc(existing.data[0]._id).update({ items, updatedAt: Date.now() });
    } else {
      await collection.add({ userId, items, updatedAt: Date.now() });
    }
  } catch (e) {
    console.warn('[CloudBase] 保存收藏失败:', e);
  }
}

export async function loadBookmarks(userId: string): Promise<any[] | null> {
  if (!ready || !userId) return null;
  try {
    const res = await getDb().collection('user_bookmarks').where({ userId }).limit(1).get();
    if (res.data?.length > 0) return res.data[0].items || [];
  } catch (e) {
    console.warn('[CloudBase] 加载收藏失败:', e);
  }
  return null;
}

// ============================================
// 管理员功能
// ============================================
export interface AdminUserItem {
  _id: string;
  _key: string;
  username: string;
  nickname: string;
  avatar: string;
  createdAt: number;
  xp: number;
  level: number;
  updatedAt?: number;
}

/** 管理员：列出所有用户 */
export async function adminListAllUsers(): Promise<AdminUserItem[]> {
  if (!ready) { await initCloudBase(); }
  if (!ready) return [];

  try {
    const res = await getDb().collection('users').limit(100).get();
    return (res.data || []).map((u: any) => ({
      _id: u._id,
      _key: u._key || u.username?.toLowerCase() || '',
      username: u.username || '',
      nickname: u.nickname || '',
      avatar: u.avatar || '',
      createdAt: u.createdAt || 0,
      xp: u.xp || 0,
      level: u.level || 1,
      updatedAt: u.updatedAt,
    }));
  } catch (e) {
    console.warn('[Admin] 列出用户失败:', e);
    return [];
  }
}

/** 管理员：删除用户及其关联数据 */
export async function adminDeleteUser(username: string): Promise<boolean> {
  if (!ready) return false;

  const key = username.toLowerCase();
  try {
    for (const [collName, field] of [['users', '_key'], ['user_history', 'userId'], ['user_bookmarks', 'userId']]) {
      const res = await getDb().collection(collName).where({ [field]: key }).limit(1).get();
      if (res.data?.length > 0) {
        await getDb().collection(collName).doc(res.data[0]._id).remove();
      }
    }
    return true;
  } catch (e) {
    console.warn('[Admin] 删除用户失败:', e);
    return false;
  }
}

/** 管理员：获取用户搜索历史 */
export async function adminGetUserHistory(username: string): Promise<{ query: string; timestamp: number }[]> {
  if (!ready) return [];

  try {
    const res = await getDb().collection('user_history').where({ userId: username.toLowerCase() }).limit(1).get();
    return res.data?.[0]?.items || [];
  } catch { return []; }
}

/** 管理员：获取用户收藏 */
export async function adminGetUserBookmarks(username: string): Promise<any[]> {
  if (!ready) return [];

  try {
    const res = await getDb().collection('user_bookmarks').where({ userId: username.toLowerCase() }).limit(1).get();
    return res.data?.[0]?.items || [];
  } catch { return []; }
}
