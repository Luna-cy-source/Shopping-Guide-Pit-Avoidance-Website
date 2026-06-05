/**
 * 认证系统 — 基于 CloudBase 真实用户名密码认证
 *
 * 改造前：localStorage 存用户名/密码哈希 → 换设备即丢失
 * 改造后：CloudBase 云端认证 → 任何设备登录都是同一个账号
 *
 * 数据存储策略：
 *   - 认证状态：CloudBase Auth（云端 session，自动刷新）
 *   - 用户资料：CloudBase 用户 metadata（昵称、头像等）
 *   - 收藏/历史：localStorage（快速） + CloudBase NoSQL（跨设备同步）
 */

import { getAuth, callFunction } from './cloudbase-client';
import { saveUserProfile as saveProfileToCloud, initCloudBase } from './cloudbase-storage';

// ============================================
// 类型
// ============================================
export interface UserInfo {
  uid: string;          // CloudBase 唯一用户 ID（全局唯一，不变）
  username: string;     // 登录用户名
  nickname: string;     // 显示昵称
  avatar: string;       // 头像 (emoji)
  createdAt: number;    // 注册时间戳
  xp: number;           // 经验值
  level: number;        // 等级
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserInfo;
}

// ============================================
// 工具函数
// ============================================
const AVATARS: string[] = [
  String.fromCodePoint(0x1F98A),  // 🦊 fox
  String.fromCodePoint(0x1F431),  // 🐱 cat
  String.fromCodePoint(0x1F43C),  // 🐼 panda
  String.fromCodePoint(0x1F428),  // 🐨 koala
  String.fromCodePoint(0x1F481),  // 🦁 lion
  String.fromCodePoint(0x1F42F),  // 🐯 tiger
  String.fromCodePoint(0x1F438),  // 🐸 frog
  String.fromCodePoint(0x1F989),  // 🦉 owl
];

function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function calcLevel(xp: number): number {
  if (xp >= 5000) return 8;
  if (xp >= 3000) return 7;
  if (xp >= 2000) return 6;
  if (xp >= 1200) return 5;
  if (xp >= 700) return 4;
  if (xp >= 300) return 3;
  if (xp >= 100) return 2;
  return 1;
}

/** 将 CloudBase 用户对象映射为我们的 UserInfo */
function mapCloudUser(cloudUser: any): UserInfo {
  const meta = cloudUser.user_metadata || {};
  return {
    uid: cloudUser.id,
    username: meta.username || '',
    nickname: meta.nickName || meta.nickname || meta.username || '新用户',
    avatar: meta.avatarUrl || randomAvatar(),
    createdAt: cloudUser.created_at ? new Date(cloudUser.created_at).getTime() : Date.now(),
    xp: parseInt(meta.xp || '20', 10),
    level: parseInt(meta.level || '1', 10),
  };
}

// ============================================
// 本地缓存（用于同步读取，避免 async 等待）
// ============================================
const CACHE_KEY_USER = 'avp_user_cache';
const CACHE_KEY_LOGGED_IN = 'avp_logged_in';

/** 缓存用户信息到 localStorage */
export function cacheUserInfo(user: UserInfo | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    try { localStorage.setItem(CACHE_KEY_USER, JSON.stringify(user)); } catch {}
    localStorage.setItem(CACHE_KEY_LOGGED_IN, 'true');
  } else {
    localStorage.removeItem(CACHE_KEY_USER);
    localStorage.removeItem(CACHE_KEY_LOGGED_IN);
  }
}

// ============================================
// 用户资料同步到 CloudBase NoSQL（异步，不阻塞主流程）
// ============================================
async function syncUserProfile(user: UserInfo): Promise<void> {
  try {
    await initCloudBase();
    await saveProfileToCloud({
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
    });
    console.log('[用户资料] 已同步到 NoSQL:', user.username);
  } catch (e) {
    // 非关键操作，失败不影响登录
    console.warn('[用户资料] 同步失败（非致命）:', e);
  }
}

// ============================================
// 注册
// ============================================
export async function register(username: string, password: string, nickname?: string): Promise<AuthResult> {
  // 基础校验
  if (!username || username.length < 2) return { success: false, error: '用户名至少2个字符' };
  if (username.length > 20) return { success: false, error: '用户名最多20个字符' };
  if (!password || password.length < 8) return { success: false, error: '密码至少8个字符' };
  if (password.length > 32) return { success: false, error: '密码最多32个字符' };

  // 密码复杂度：大写、小写、数字、特殊字符 至少3种
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const cmpl = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (cmpl < 3) {
    return { success: false, error: '密码需包含大写字母、小写字母、数字、特殊字符(如@#$%)中至少3种' };
  }

  try {
    console.log('[注册] 调用云函数 registerUser', { username });
    const result = await callFunction('registerUser', { username, password, nickname: nickname || username });
    console.log('[注册] 云函数返回:', result);

    if (result.success) {
      return { success: true };
    }
    return { success: false, error: result.error || '注册失败' };
  } catch (e: any) {
    console.error('[注册异常]', e);
    return { success: false, error: e?.message || '网络异常' };
  }
}

// ============================================
// 登录
// ============================================
export async function login(username: string, password: string): Promise<AuthResult> {
  const auth = getAuth();

  if (!username || !password) {
    return { success: false, error: '请输入用户名和密码' };
  }

  // 尝试 username 和 email 两种模式登录
  const email = `${username.toLowerCase()}@pit-avoidance.app`;
  const modes = [
    { label: 'username', params: { username, password } },
    { label: 'email', params: { email, password } },
  ];

  for (const mode of modes) {
    console.log(`[登录] 尝试 ${mode.label}`);
    try {
      const result = await auth.signInWithPassword(mode.params);

      if (result.error) {
        const msg = String(result.error.message || result.error?.code || '');
        console.log(`[登录] ${mode.label} 失败:`, msg || JSON.stringify(result.error));
        continue;
      }

      const user = mapCloudUser(result.data.user);
      cacheUserInfo(user);
      console.log(`[登录成功] ${mode.label}! 用户:`, user.username);

      // 异步同步用户资料到 CloudBase NoSQL（不阻塞登录流程）
      syncUserProfile(user).catch(() => {});

      return { success: true, user };

    } catch (e: any) {
      console.log(`[登录] ${mode.label} 异常:`, e?.message);
    }
  }

  return { success: false, error: '用户名或密码错误' };
}

// ============================================
// 登出
// ============================================
export async function logout(): Promise<void> {
  const auth = getAuth();
  try {
    await auth.signOut();
  } catch {
    // signOut 失败也要继续清理本地状态
  }
  // 强制清除所有本地缓存
  cacheUserInfo(null);
  // 清除 CloudBase 持久化的 session（双重保障）
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cloudbase_session');
    }
  } catch {}
}

// ============================================
// 获取当前会话（异步，从 CloudBase 拉取最新状态）
// ============================================
export async function getCurrentSessionAsync(): Promise<{ user: UserInfo } | null> {
  const auth = getAuth();
  try {
    const { data } = await auth.getSession();

    if (!data?.session) return null;

    // 排除匿名用户
    if (data.session.user?.is_anonymous) return null;

    const user = mapCloudUser(data.session.user);
    cacheUserInfo(user);
    return { user };
  } catch {
    return null;
  }
}

// ============================================
// 同步接口（从本地缓存快速读取）
// ============================================

/** 是否已登录（同步，用于渲染判断） */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CACHE_KEY_LOGGED_IN) === 'true';
}

/** 获取当前用户（同步，从缓存） */
export function getCurrentUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
