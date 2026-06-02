'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

// =====================================================
// 全局顶部导航栏 — 极简实验室风格
// Logo + 三个功能 Tab + 自定义用户区
// =====================================================

interface NavTab {
  label: string;
  path: string;
  icon: string;
}

const NAV_TABS: NavTab[] = [
  { label: '单品检测', path: '/', icon: '🔍' },
  { label: '1v1 对比', path: '/compare', icon: '🥊' },
  { label: '智商税黑榜', path: '/blacklist', icon: '📉' },
  { label: '选品诊所', path: '/clinic', icon: '💡' },
  { label: '二手防坑', path: '/used-check', icon: '🛡️' },
  { label: '排雷曝光', path: '/expose', icon: '🔥' },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (tabPath: string) => {
    if (tabPath === '/') return pathname === '/';
    return pathname.startsWith(tabPath);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl transition-shadow duration-300 ${
        scrolled
          ? 'border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'border-slate-100/80'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3">
        {/* ---- 左侧 Logo ---- */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 text-sm font-bold text-slate-900 transition-opacity hover:opacity-70"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-sm shadow-red-200/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              />
            </svg>
          </div>
          <span className="whitespace-nowrap hidden sm:inline">AI避坑独立实验室</span>
        </Link>

        {/* ---- 中间导航 Tabs ---- */}
        <nav className="mx-auto flex items-center gap-0.5">
          {NAV_TABS.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-red-50/60 text-red-600 shadow-[inset_0_1px_0_rgba(239,68,68,0.1)]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
                }`}
              >
                <span className="text-sm leading-none transition-transform duration-200 group-hover:scale-110">
                  {tab.icon}
                </span>
                <span className="hidden lg:inline">{tab.label}</span>
                {/* 当前页高亮下划线 + 脉动圆点 */}
                {active && (
                  <>
                    <span className="absolute bottom-1 left-1/2 h-0.5 w-1/2 -translate-x-1/2 rounded-full bg-red-400/70" />
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-soft-pulse ring-2 ring-white" />
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ---- 右侧用户区（自定义认证）---- */}
        <div className="flex shrink-0 items-center gap-3">
          {/* 个人主页入口 */}
          <Link
            href="/profile"
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-100/50 active:scale-95 sm:px-4"
          >
            👤 个人主页
          </Link>

          {/* 登录 / 用户头像 */}
          {isAuthenticated && user ? (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 pl-1 pr-2.5 py-0.5 shadow-sm transition-all hover:border-purple-300 hover:shadow-md"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs">{user.avatar}</span>
              <span className="max-w-[60px] truncate text-[11px] font-medium text-purple-700">{user.nickname || user.username}</span>
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-100/50 active:scale-95 sm:px-4"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
