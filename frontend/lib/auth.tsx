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

import { getAuth } from './cloudbase-client';

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
// 注册
// ============================================
export async function register(username: string, password: string, nickname?: string): Promise<AuthResult> {
  const auth = getAuth();

  // 基础校验
  if (!username || username.length < 2) return { success: false, error: '用户名至少2个字符' };
  if (username.length > 20) return { success: false, error: '用户名最多20个字符' };
  if (!password || password.length < 4) return { success: false, error: '密码至少4个字符' };

  const name = nickname || username;
  // v3 SDK signUp 强制要求 email 或 phone
  const placeholderEmail = `${username.toLowerCase()}@pit-avoidance.app`;

  try {
    // === 尝试1: 纯用户名注册（文档标准方式）===
    console.log('[注册] 尝试1: 纯用户名模式 signUp({username,password})');
    let result = await auth.signUp({ username, password });
    
    if (result.error) {
      console.log('[注册] 尝试1失败:', JSON.stringify(result.error));
      
      // === 尝试2: 带 email 字段注册（v3 SDK 强制要求）===
      if (String(result.error.message || '').includes('email') || String(result.error.message || '').includes('phone')) {
        console.log('[注册] 尝试2: 带email字段 signUp({email,username,password})');
        result = await (auth as any).signUp({ email: placeholderEmail, username, password });
      }
      
      if (result.error) {
        const msg = String(result.error.message || '');
        console.error('[注册全部失败]', msg);
        if (msg.includes('已存在') || msg.includes('already') || msg.includes('exist') || msg.includes('taken')) {
          return { success: false, error: `[SIGNUP-EXIST] 用户名已被注册: ${msg}` };
        }
        return { success: false, error: `[SIGNUP-FAIL] ${msg || '未知错误'}` };
      }
    }

    // 注册成功 → 立即尝试自动登录
    console.log('[注册成功] 尝试自动登录...');
    const loginResult = await autoSignIn(auth, username, password, placeholderEmail);
    
    if (loginResult.success && loginResult.user) {
      console.log('[注册+自动登录成功] 用户:', username);
      return { success: true, user: loginResult.user };
    }
    
    // 注册成功但自动登录失败，返回注册成功让用户手动登录
    console.log('[注册成功] 自动登录失败，引导手动登录');
    return { success: true, user: undefined };

  } catch (e: any) {
    console.error('[注册异常-catch]', e);
    return { success: false, error: `[SIGNUP-EXCEPTION] ${e?.message || '网络异常'}` };
  }
}

// 自动登录辅助函数：依次尝试多种模式
async function autoSignIn(auth: any, username: string, password: string, email: string): Promise<AuthResult> {
  const modes = [
    { label: '纯username', params: { username, password } },
    { label: 'email格式', params: { email, password } },
    { label: '纯email(无username)', params: { email, password } },
  ];

  for (const mode of modes) {
    console.log(`[自动登录] 尝试 ${mode.label}:`, JSON.stringify(mode.params));
    try {
      const result = await auth.signInWithPassword(mode.params);
      if (!result.error && result.data?.user) {
        const user = mapCloudUser(result.data.user);
        cacheUserInfo(user);
        console.log(`[自动登录] ${mode.label} 成功!`);
        return { success: true, user };
      }
      console.log(`[自动登录] ${mode.label} 失败:`, result.error?.message || '(无error)');
    } catch (e: any) {
      console.log(`[自动登录] ${mode.label} 异常:`, e?.message);
    }
  }

  return { success: false, error: '所有登录模式均失败' };
}

// ============================================
// 登录
// ============================================
export async function login(username: string, password: string): Promise<AuthResult> {
  const auth = getAuth();

  if (!username || !password) {
    return { success: false, error: '请输入用户名和密码' };
  }

  const loginEmail = `${username.toLowerCase()}@pit-avoidance.app`;

  // 依次尝试多种登录模式
  const modes = [
    { label: 'email模式', params: { email: loginEmail, password } },
    { label: 'username模式', params: { username, password } },
  ];

  for (const mode of modes) {
    console.log(`[登录] 尝试 ${mode.label}:`, JSON.stringify(mode.params));
    try {
      const result = await auth.signInWithPassword(mode.params);
      
      if (result.error) {
        const msg = String(result.error.message || '');
        console.log(`[登录] ${mode.label} 失败:`, msg);
        // 继续尝试下一种模式
        continue;
      }

      // 登录成功
      const user = mapCloudUser(result.data.user);
      cacheUserInfo(user);
      console.log(`[登录成功] ${mode.label}! 用户:`, user.username);
      return { success: true, user };
      
    } catch (e: any) {
      console.log(`[登录] ${mode.label} 异常:`, e?.message);
    }
  }

  // 所有模式都失败
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
