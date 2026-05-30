'use client';

import { useState, useEffect } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

// =====================================================
// 报告页右上角认证按钮（纯客户端组件）
// 使用 mounted 状态避免 Clerk 的 hydration mismatch
// =====================================================
export default function AuthButtons() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-7 w-16 rounded-full border border-gray-200 bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 transition-all hover:border-red-300 hover:text-red-500">
            登录
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-7 w-7',
            },
          }}
        />
      </SignedIn>
    </div>
  );
}
