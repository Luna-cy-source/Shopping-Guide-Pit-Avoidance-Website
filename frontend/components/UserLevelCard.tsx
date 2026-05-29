'use client';

import { useState, useEffect, useCallback } from 'react';
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import {
  getUserProgress,
  getLevelProgressPercent,
  getNextLevelXP,
  calcLevel,
  dailyCheckIn,
  type UserProgress,
} from '../lib/userLevel';

// =====================================================
// 用户等级卡片 — 大气简洁版（适配报告页右上角）
// 与登录状态强关联：未登录引导登录，已登录展示数据
// =====================================================

export default function UserLevelCard() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setProgress(getUserProgress());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ai_lab_user_progress') refresh();
    };
    window.addEventListener('storage', onStorage);
    const interval = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [refresh]);

  if (!mounted) {
    return (
      <div className="h-[136px] w-[272px] animate-pulse rounded-2xl border border-slate-100 bg-slate-50" />
    );
  }

  const levelInfo = progress ? calcLevel(progress.xp) : calcLevel(0);
  const percent = progress ? getLevelProgressPercent(progress.xp, progress.level) : 0;
  const nextXP = progress ? getNextLevelXP(progress.level) : 50;
  const currentXP = progress ? progress.xp : 0;

  // 签到状态
  const today = new Date().toISOString().slice(0, 10);
  const checkedIn = progress?.dailyCheckInDate === today;

  const handleCheckIn = () => {
    dailyCheckIn();
    refresh();
  };

  return (
    <div className="w-[272px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      {/* 顶部：等级 + 状态标签 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{levelInfo.emoji}</span>
          <div className="leading-tight">
            <span className="text-[13px] font-bold text-slate-800">{levelInfo.title}</span>
            <span className="ml-1 text-[11px] text-slate-400">Lv.{levelInfo.level}</span>
          </div>
        </div>

        <SignedIn>
          {checkedIn ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              已签到
            </span>
          ) : (
            <button
              type="button"
              onClick={handleCheckIn}
              className="rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm shadow-blue-200/40 transition-all hover:shadow-md active:scale-95"
            >
              签到
            </button>
          )}
        </SignedIn>
        <SignedOut>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400">未登录</span>
        </SignedOut>
      </div>

      {/* XP 进度 */}
      <div className="px-5 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>{currentXP} / {nextXP} XP</span>
          <span className="text-slate-300">{percent}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 统计数据 */}
      <div className="grid grid-cols-4 gap-2 px-5 pb-4">
        {[
          { icon: '🔍', value: progress?.totalSearches ?? 0, label: '搜索' },
          { icon: '📊', value: progress?.totalReports ?? 0, label: '报告' },
          { icon: '🥊', value: progress?.totalCompares ?? 0, label: '对比' },
          { icon: '🔥', value: progress?.streakDays ?? 0, label: '连续' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center rounded-xl bg-slate-50/60 py-2">
            <span className="text-base leading-none">{s.icon}</span>
            <span className="mt-1 text-sm font-bold text-slate-700">{s.value}</span>
            <span className="mt-0.5 text-[10px] text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* 底部：登录关联 */}
      <div className="border-t border-slate-50 px-5 py-3">
        <SignedOut>
          <SignInButton mode="modal">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-[12px] font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              登录解锁等级追踪
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <p className="text-center text-[10px] leading-relaxed text-slate-400">
            💡 搜索商品、查看报告、使用对比功能都能获得 XP，升级解锁更多特权
          </p>
        </SignedIn>
      </div>
    </div>
  );
}
