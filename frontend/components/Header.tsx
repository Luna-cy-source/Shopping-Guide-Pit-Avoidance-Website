'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

// =====================================================
// 全局顶部导航栏 — 极简实验室风格
// Logo + 三个功能 Tab + Clerk 用户区
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
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setMounted(true);
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

        {/* ---- 右侧用户区 ---- */}
        <div className="flex shrink-0 items-center gap-3">
          {!mounted ? (
            <div className="h-8 w-20 animate-pulse rounded-full border border-slate-100 bg-slate-100/80" />
          ) : (
            <>
              {/* 个人主页入口 */}
              <Link
                href="/profile"
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-100/50 active:scale-95"
              >
                👤 个人主页
              </Link>

              <SignedOut>
                <SignInButton mode="modal">
                  <button className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-100/50 active:scale-95">
                    登录 / 注册
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8 ring-2 ring-red-100 hover:ring-red-200 transition-all',
                    },
                  }}
                />
              </SignedIn>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
