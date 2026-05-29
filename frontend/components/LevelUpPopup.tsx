'use client';

import { useState, useEffect } from 'react';
import { type LevelConfig } from '../lib/userLevel';

interface LevelUpPopupProps {
  levelInfo: LevelConfig;
  onClose: () => void;
}

export default function LevelUpPopup({ levelInfo, onClose }: LevelUpPopupProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    // 入场动画
    requestAnimationFrame(() => setVisible(true));

    // 生成彩带粒子
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const pts = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      size: 4 + Math.random() * 6,
    }));
    setParticles(pts);

    // 自动关闭
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-400 ${
        visible ? 'bg-black/30 backdrop-blur-sm' : 'bg-black/0 pointer-events-none'
      }`}
      onClick={() => {
        setVisible(false);
        setTimeout(onClose, 400);
      }}
    >
      <div
        className={`relative mx-4 w-full max-w-sm rounded-3xl border border-white/50
                    bg-white/95 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.2)]
                    backdrop-blur-2xl transition-all duration-500
                    ${visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 彩带粒子 */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full animate-fade-in-up pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: '1.2s',
            }}
          />
        ))}

        {/* 升级图标 */}
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl
                      ${levelInfo.bgColor} text-4xl shadow-sm
                      animate-fade-in-up`}
          style={{ animationDelay: '0.1s' }}
        >
          {levelInfo.emoji}
        </div>

        {/* 标题 */}
        <p
          className="animate-fade-in-up text-xs font-semibold uppercase tracking-widest text-slate-400"
          style={{ animationDelay: '0.15s' }}
        >
          等级提升
        </p>
        <h3
          className={`animate-fade-in-up mt-1 text-2xl font-extrabold ${levelInfo.color}`}
          style={{ animationDelay: '0.2s' }}
        >
          {levelInfo.title}
        </h3>
        <p
          className="animate-fade-in-up mt-2 text-sm text-slate-500"
          style={{ animationDelay: '0.25s' }}
        >
          {levelInfo.desc}
        </p>

        {/* 等级号 */}
        <div
          className="animate-fade-in-up mt-5 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5"
          style={{ animationDelay: '0.3s' }}
        >
          <span className="text-lg">{levelInfo.emoji}</span>
          <span className="text-sm font-bold text-slate-700">
            Lv.{levelInfo.level}
          </span>
        </div>

        {/* 关闭提示 */}
        <p className="mt-6 text-[10px] text-slate-300">
          点击任意处关闭
        </p>
      </div>
    </div>
  );
}
