'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import AuthButtons from './AuthButtons';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 关闭路由切换时关闭菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (tabPath: string) => {
    if (tabPath === '/') return pathname === '/';
    return pathname.startsWith(tabPath);
  };

  const navLinkClass = (tabPath: string) => {
    const active = isActive(tabPath);
    return `relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
      active
        ? 'bg-red-50/60 text-red-600 shadow-[inset_0_1px_0_rgba(239,68,68,0.1)]'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80'
    }`;
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-500 shadow-sm shadow-red-200/30">
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

        {/* ---- 中间导航 Tabs（桌面端）---- */}
        <nav className="mx-auto hidden items-center gap-0.5 lg:flex">
          {NAV_TABS.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={navLinkClass(tab.path)}
              >
                <span className="text-sm leading-none transition-transform duration-200 group-hover:scale-110">
                  {tab.icon}
                </span>
                {tab.label}
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

        {/* ---- 右侧用户区（桌面端） ---- */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href="/profile"
            className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-500 shadow-sm transition-all duration-200 hover:border-red-300 hover:text-red-500 hover:shadow-md hover:shadow-red-100/50 active:scale-95 sm:px-4"
          >
            👤 个人主页
          </Link>
          <AuthButtons />
        </div>

        {/* ---- 移动端：登录 + 汉堡菜单 ---- */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <Link
            href="/profile"
            className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm sm:px-2.5 sm:text-[12px]"
          >
            👤
          </Link>
          <AuthButtons />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 flex-col items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            <span className={`block h-0.5 w-4.5 rounded-full bg-current transition-all duration-200 ${mobileMenuOpen ? 'translate-y-1 rotate-45' : ''}`} />
            <span className={`mt-1 block h-0.5 w-4.5 rounded-full bg-current transition-all duration-200 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`mt-1 block h-0.5 w-4.5 rounded-full bg-current transition-all duration-200 ${mobileMenuOpen ? '-translate-y-1 -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* ---- 移动端下拉菜单 ---- */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-0.5">
            {NAV_TABS.map((tab) => {
              const active = isActive(tab.path);
              return (
                <Link
                  key={tab.path}
                  href={tab.path}
                  className={`${navLinkClass(tab.path)} w-full`}
                >
                  <span className="text-sm">{tab.icon}</span>
                  {tab.label}
                  {active && (
                    <span className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-red-500" />
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3">
            <AuthButtons />
          </div>
        </div>
      )}
    </header>
  );
}
