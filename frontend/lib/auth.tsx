/**
 * 自定义认证系统 — 纯客户端（localStorage）
 * 支持注册、登录、登出，密码 SHA-256 哈希存储
 */

export interface UserInfo {
  username: string;
  nickname: string;
  avatar: string;       // emoji 头像
  createdAt: number;
  xp: number;           // 经验值
  level: number;
}

interface AuthSession {
  user: UserInfo;
  token: string;        // 简单 token（username + timestamp 的 hash）
  expiresAt: number;
}

const USERS_KEY = 'avp_users';
const SESSION_KEY = 'avp_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

// ============================================
// 密码工具
// ============================================
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_avp_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken(username: string): string {
  const raw = `${username}:${Date.now()}:avp_secret`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// Avatar emoji list (unicode escapes to avoid encoding issues)
const AVATARS: string[] = [
  String.fromCodePoint(0x1F98A), // fox
  String.fromCodePoint(0x1F431), // cat
  String.fromCodePoint(0x1F43C), // panda
  String.fromCodePoint(0x1F428), // koala
  String.fromCodePoint(0x1F481), // lion
  String.fromCodePoint(0x1F42F), // tiger
  String.fromCodePoint(0x1F438), // frog
  String.fromCodePoint(0x1F989), // owl
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

// ============================================
// 用户存储操作（localStorage）
// ============================================
function getUsers(): Record<string, { passwordHash: string; user: UserInfo }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, { passwordHash: string; user: UserInfo }>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// ============================================
// 注册
// ============================================
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: UserInfo;
}

export async function register(username: string, password: string, nickname?: string): Promise<AuthResult> {
  // 基础校验
  if (!username || username.length < 2) {
    return { success: false, error: '用户名至少2个字符' };
  }
  if (username.length > 20) {
    return { success: false, error: '用户名最多20个字符' };
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return { success: false, error: '用户名只能包含字母、数字、下划线和中文' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: '密码至少4个字符' };
  }
  if (password.length > 50) {
    return { success: false, error: '密码最多50个字符' };
  }

  const users = getUsers();
  const key = username.toLowerCase();

  if (users[key]) {
    return { success: false, error: '用户名已存在' };
  }

  const passwordHash = await hashPassword(password);
  const now = Date.now();

  const user: UserInfo = {
    username,
    nickname: nickname || username,
    avatar: randomAvatar(),
    createdAt: now,
    xp: 20, // 注册赠送20经验
    level: 1,
  };

  users[key] = { passwordHash, user };
  saveUsers(users);

  // 自动登录
  const session: AuthSession = {
    user,
    token: generateToken(username),
    expiresAt: now + SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, user };
}

// ============================================
// 登录
// ============================================
export async function login(username: string, password: string): Promise<AuthResult> {
  if (!username || !password) {
    return { success: false, error: '请输入用户名和密码' };
  }

  const users = getUsers();
  const key = username.toLowerCase();
  const record = users[key];

  if (!record) {
    return { success: false, error: '用户名或密码错误' };
  }

  const passwordHash = await hashPassword(password);
  if (passwordHash !== record.passwordHash) {
    return { success: false, error: '用户名或密码错误' };
  }

  // 登录奖励经验
  record.user.xp += 5;
  record.user.level = calcLevel(record.user.xp);
  saveUsers(users);

  const session: AuthSession = {
    user: record.user,
    token: generateToken(username),
    expiresAt: Date.now() + SESSION_DURATION,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, user: record.user };
}

// ============================================
// 登出
// ============================================
export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

// ============================================
// 获取当前会话
// ============================================
export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: AuthSession = JSON.parse(raw);

    // 检查过期
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    // 同步最新的用户数据
    const users = getUsers();
    const key = session.user.username.toLowerCase();
    if (users[key]?.user) {
      session.user = users[key].user;
    }

    return session;
  } catch {
    return null;
  }
}

// ============================================
// 检查是否已登录
// ============================================
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

// ============================================
// 获取当前用户
// ============================================
export function getCurrentUser(): UserInfo | null {
  const session = getCurrentSession();
  return session?.user || null;
}
