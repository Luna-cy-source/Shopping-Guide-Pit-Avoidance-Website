/**
 * 用户等级 / 头衔系统
 * --------------------
 * 本地存储经验值，纯前端实现。
 * 通过 XP 积累解锁头衔，在 Header、评价墙、小精灵等位置展示。
 */

const STORAGE_KEY = 'ai_lab_user_progress';

/* ---------- 等级配置 ---------- */
export interface LevelConfig {
  level: number;
  title: string;
  emoji: string;
  minXP: number;
  color: string; // Tailwind text color
  bgColor: string; // Tailwind bg color
  ringColor: string; // Tailwind ring color
  desc: string;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    title: '消费新手',
    emoji: '🌱',
    minXP: 0,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
    ringColor: 'ring-slate-200',
    desc: '刚踏入避坑世界的新朋友',
  },
  {
    level: 2,
    title: '精明小白',
    emoji: '🔍',
    minXP: 50,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    ringColor: 'ring-blue-200',
    desc: '开始学会自己查商品了',
  },
  {
    level: 3,
    title: '避坑学徒',
    emoji: '🛡️',
    minXP: 150,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    ringColor: 'ring-indigo-200',
    desc: '已经能识别常见套路',
  },
  {
    level: 4,
    title: '数码控',
    emoji: '💻',
    minXP: 300,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    ringColor: 'ring-cyan-200',
    desc: '数码3C领域小有研究',
  },
  {
    level: 5,
    title: '护肤达人',
    emoji: '💄',
    minXP: 500,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    ringColor: 'ring-pink-200',
    desc: '美妆护肤门儿清',
  },
  {
    level: 6,
    title: '理性消费派',
    emoji: '🧠',
    minXP: 800,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    ringColor: 'ring-violet-200',
    desc: '冷静分析，不被营销洗脑',
  },
  {
    level: 7,
    title: '排雷先锋',
    emoji: '⚡',
    minXP: 1200,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    ringColor: 'ring-amber-200',
    desc: ' actively 帮别人避坑',
  },
  {
    level: 8,
    title: '避坑大师',
    emoji: '👑',
    minXP: 1800,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    ringColor: 'ring-yellow-200',
    desc: '大师级消费决策力',
  },
  {
    level: 9,
    title: '消费侦探',
    emoji: '🔎',
    minXP: 2500,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    ringColor: 'ring-orange-200',
    desc: '深挖隐藏成本和套路',
  },
  {
    level: 10,
    title: '鉴伪宗师',
    emoji: '🏆',
    minXP: 3500,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    ringColor: 'ring-red-200',
    desc: '登峰造极，传说级存在',
  },
];

/* ---------- 经验值动作 ---------- */
export const XP_ACTIONS = {
  SEARCH: { key: 'search', xp: 5, label: '搜索商品', cooldown: 5000 },
  VIEW_REPORT: { key: 'view_report', xp: 10, label: '查看检测报告' },
  COMPARE: { key: 'compare', xp: 15, label: '使用对比功能' },
  VIEW_BLACKLIST: { key: 'view_blacklist', xp: 5, label: '查看黑榜' },
  SUBMIT_EXPOSE: { key: 'submit_expose', xp: 25, label: '提交排雷曝光' },
  DAILY_LOGIN: { key: 'daily_login', xp: 10, label: '每日登录' },
  BOOKMARK: { key: 'bookmark', xp: 3, label: '收藏商品' },
  SHARE: { key: 'share', xp: 8, label: '分享报告' },
  USE_CLINIC: { key: 'use_clinic', xp: 12, label: '使用选品诊所' },
  CHECK_USED: { key: 'check_used', xp: 10, label: '使用二手防坑' },
} as const;

export type XPActionKey = keyof typeof XP_ACTIONS;

/* ---------- 用户进度数据结构 ---------- */
export interface UserProgress {
  xp: number;
  level: number;
  title: string;
  emoji: string;
  achievements: string[];
  actionLog: Record<string, number>; // actionKey -> lastTimestamp
  dailyCheckInDate: string | null; // YYYY-MM-DD
  totalSearches: number;
  totalReports: number;
  totalCompares: number;
  streakDays: number; // 连续登录天数
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/* ---------- 读取进度 ---------- */
export function getUserProgress(): UserProgress {
  if (typeof window === 'undefined') {
    return createDefaultProgress();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as UserProgress;
      // 自动修复：确保字段完整
      return { ...createDefaultProgress(), ...data };
    }
  } catch {
    // ignore
  }
  return createDefaultProgress();
}

function createDefaultProgress(): UserProgress {
  return {
    xp: 0,
    level: 1,
    title: LEVELS[0].title,
    emoji: LEVELS[0].emoji,
    achievements: [],
    actionLog: {},
    dailyCheckInDate: null,
    totalSearches: 0,
    totalReports: 0,
    totalCompares: 0,
    streakDays: 0,
  };
}

/* ---------- 保存进度 ---------- */
function saveProgress(p: UserProgress) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/* ---------- 根据 XP 计算等级 ---------- */
export function calcLevel(xp: number): LevelConfig {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) return LEVELS[i];
  }
  return LEVELS[0];
}

/* ---------- 获取下一级所需 XP ---------- */
export function getNextLevelXP(currentLevel: number): number {
  const next = LEVELS.find((l) => l.level === currentLevel + 1);
  return next ? next.minXP : LEVELS[LEVELS.length - 1].minXP;
}

/* ---------- 获取当前级已积累的 XP ---------- */
export function getCurrentLevelProgress(xp: number, level: number): number {
  const current = LEVELS.find((l) => l.level === level);
  if (!current) return xp;
  return xp - current.minXP;
}

/* ---------- 获取当前级进度百分比 ---------- */
export function getLevelProgressPercent(xp: number, level: number): number {
  const current = LEVELS.find((l) => l.level === level);
  const next = LEVELS.find((l) => l.level === level + 1);
  if (!current || !next) return 100;
  const earned = xp - current.minXP;
  const needed = next.minXP - current.minXP;
  return Math.min(100, Math.round((earned / needed) * 100));
}

/* ---------- 增加 XP ---------- */
export function addXP(actionKey: XPActionKey): {
  progress: UserProgress;
  leveledUp: boolean;
  gained: number;
  newTitle?: string;
} {
  const action = XP_ACTIONS[actionKey];
  const p = getUserProgress();
  const now = Date.now();

  // 冷却检查（防止刷分）
  const lastTime = p.actionLog[action.key] || 0;
  if (now - lastTime < action.cooldown) {
    return { progress: p, leveledUp: false, gained: 0 };
  }

  const oldLevel = p.level;
  p.xp += action.xp;
  p.actionLog[action.key] = now;

  // 统计计数
  if (actionKey === 'SEARCH') p.totalSearches++;
  if (actionKey === 'VIEW_REPORT') p.totalReports++;
  if (actionKey === 'COMPARE') p.totalCompares++;

  // 重新计算等级
  const newLevel = calcLevel(p.xp);
  p.level = newLevel.level;
  p.title = newLevel.title;
  p.emoji = newLevel.emoji;

  const leveledUp = newLevel.level > oldLevel;
  saveProgress(p);

  return {
    progress: p,
    leveledUp,
    gained: action.xp,
    newTitle: leveledUp ? newLevel.title : undefined,
  };
}

/* ---------- 每日签到 ---------- */
export function dailyCheckIn(): {
  progress: UserProgress;
  checkedIn: boolean;
  streakBonus: number;
} {
  const p = getUserProgress();
  const today = getToday();

  if (p.dailyCheckInDate === today) {
    return { progress: p, checkedIn: false, streakBonus: 0 };
  }

  // 连续签到逻辑
  if (p.dailyCheckInDate === getYesterday()) {
    p.streakDays++;
  } else {
    p.streakDays = 1;
  }
  p.dailyCheckInDate = today;

  // 连续奖励：每7天额外奖励
  const streakBonus = p.streakDays % 7 === 0 ? 20 : 0;
  p.xp += XP_ACTIONS.DAILY_LOGIN.xp + streakBonus;

  const newLevel = calcLevel(p.xp);
  p.level = newLevel.level;
  p.title = newLevel.title;
  p.emoji = newLevel.emoji;

  saveProgress(p);
  return { progress: p, checkedIn: true, streakBonus };
}

/* ---------- 重置进度（调试用） ---------- */
export function resetProgress() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/* ---------- 监听 XP 变化（简单 pub/sub） ---------- */
const listeners = new Set<() => void>();

export function subscribeXPChange(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notifyXPChange() {
  listeners.forEach((cb) => cb());
}
