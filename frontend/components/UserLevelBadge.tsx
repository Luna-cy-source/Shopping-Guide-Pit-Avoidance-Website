'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getUserProgress,
  getLevelProgressPercent,
  getNextLevelXP,
  calcLevel,
  type LevelConfig,
  type UserProgress,
} from '../lib/userLevel';

interface UserLevelBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  interactive?: boolean;
}

export default function UserLevelBadge({
  size = 'md',
  showProgress = false,
  interactive = true,
}: UserLevelBadgeProps) {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const refresh = useCallback(() => {
    setProgress(getUserProgress());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ai_lab_user_progress') refresh();
    };
    window.addEventListener('storage', onStorage);
    const interval = setInterval(refresh, 3000); // 定期刷新
    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [refresh]);

  if (!progress) return null;

  const levelInfo = calcLevel(progress.xp);
  const percent = getLevelProgressPercent(progress.xp, progress.level);
  const nextXP = getNextLevelXP(progress.level);

  const sizeMap = {
    sm: { wrap: 'h-6 px-1.5 gap-1 text-[10px]', emoji: 'text-xs', ring: 'ring-1' },
    md: { wrap: 'h-7 px-2 gap-1 text-[11px]', emoji: 'text-sm', ring: 'ring-1' },
    lg: { wrap: 'h-9 px-3 gap-1.5 text-xs', emoji: 'text-base', ring: 'ring-2' },
  };
  const s = sizeMap[size];

  return (
    <div
      className={`relative ${interactive ? 'cursor-pointer' : ''}`}
      onClick={() => interactive && setTooltipOpen((v) => !v)}
      onMouseEnter={() => interactive && setTooltipOpen(true)}
      onMouseLeave={() => interactive && setTooltipOpen(false)}
    >
      {/* 徽章本体 */}
      <div
        className={`inline-flex items-center ${s.wrap} rounded-full
                    ${levelInfo.bgColor} ${levelInfo.color}
                    ${s.ring} ${levelInfo.ringColor}
                    transition-all duration-200 hover:shadow-sm select-none`}
      >
        <span className={s.emoji}>{levelInfo.emoji}</span>
        <span className="font-bold whitespace-nowrap">{levelInfo.title}</span>
        {showProgress && (
          <span className="text-[9px] opacity-60">Lv.{levelInfo.level}</span>
        )}
      </div>

      {/* 悬停详情浮层 */}
      {tooltipOpen && interactive && (
        <div
          className="absolute top-full left-1/2 z-[200] mt-2 w-56 -translate-x-1/2
                     rounded-xl border border-slate-100 bg-white/95 p-3.5
                     shadow-[0_8px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl
                     animate-fade-in-up"
        >
          {/* 等级信息 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${levelInfo.bgColor} text-xl`}
            >
              {levelInfo.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${levelInfo.color}`}>
                {levelInfo.title}
              </p>
              <p className="text-[10px] text-slate-400">{levelInfo.desc}</p>
            </div>
          </div>

          {/* 进度条 */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>
                Lv.{levelInfo.level} → Lv.{levelInfo.level + 1}
              </span>
              <span>
                {progress.xp} / {nextXP} XP
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${levelInfo.bgColor.replace('bg-', 'bg-').replace('50', '400')}`}
                style={{
                  width: `${percent}%`,
                  backgroundColor: undefined,
                }}
              />
            </div>
          </div>

          {/* 统计数据 */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="rounded-lg bg-slate-50 p-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">
                {progress.totalSearches}
              </p>
              <p className="text-[9px] text-slate-400">搜索</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">
                {progress.totalReports}
              </p>
              <p className="text-[9px] text-slate-400">报告</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-1.5 text-center">
              <p className="text-xs font-bold text-slate-700">
                {progress.streakDays}
              </p>
              <p className="text-[9px] text-slate-400">连续</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
