'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

const HAS_CLERK = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// =====================================================
// 全局导航栏
// 轻量级，透底融入页面，不抢夺视觉焦点
// 使用 mounted 状态避免 Clerk 的 hydration mismatch
// =====================================================
export default function Navbar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* ---- 左侧 Logo ---- */}
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-bold text-gray-700 transition-opacity hover:opacity-60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          AI 避坑
        </Link>

        {/* ---- 右侧用户区 ---- */}
        <div className="flex items-center gap-3">
          {!mounted ? (
            <div className="h-8 w-20 rounded-full border border-gray-200 bg-gray-100/80" />
          ) : HAS_CLERK ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="rounded-full border border-gray-200 bg-white/80 px-4 py-1.5 text-xs font-medium text-gray-600 shadow-sm backdrop-blur transition-all hover:border-red-300 hover:text-red-500">
                    登录 / 注册
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: 'h-8 w-8 ring-2 ring-red-100',
                    },
                  }}
                />
              </SignedIn>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
