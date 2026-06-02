'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';

// =====================================================
// 自定义认证按钮 — 登录/登出/用户头像
// 完全替代原 Clerk AuthButtons
// =====================================================
export default function AuthButtons() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showMenu) return;
    const handler = () => setShowMenu(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [showMenu]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-7 w-16 rounded-full border border-gray-200 bg-gray-100 animate-pulse" />
      </div>
    );
  }

  // 已登录：显示用户头像 + 下拉菜单
  if (isAuthenticated && user) {
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1.5 pr-3 py-0.5 transition-all hover:border-purple-300 hover:shadow-sm"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100 text-xs">
            {user.avatar}
          </span>
          <span className="max-w-[60px] truncate text-xs font-medium text-gray-700">
            {user.nickname || user.username}
          </span>
          <svg className={`h-3 w-3 text-gray-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-100 bg-white shadow-lg z-50 overflow-hidden">
            {/* 用户信息 */}
            <div className="border-b border-gray-50 px-4 py-3">
              <p className="text-xs font-semibold text-gray-900">{user.nickname || user.username}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-bold text-purple-600">
                  Lv.{user.level}
                </span>
                <span className="text-[10px] text-gray-400">{user.xp} XP</span>
              </div>
            </div>

            {/* 菜单项 */}
            <Link
              href="/profile"
              onClick={() => setShowMenu(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-600 transition-colors hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              个人主页
            </Link>

            <button
              onClick={() => {
                logout();
                setShowMenu(false);
                router.push('/');
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-500 transition-colors hover:bg-red-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              退出登录
            </button>
          </div>
        )}
      </div>
    );
  }

  // 未登录：显示登录按钮
  return (
    <Link
      href="/sign-in"
      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 transition-all hover:border-red-300 hover:text-red-500"
    >
      登录 / 注册
    </Link>
  );
}
