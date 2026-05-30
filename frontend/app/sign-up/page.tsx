'use client';

import { SignUp } from '@clerk/clerk-react';

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignUpPage() {
  if (!CLERK_KEY) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-2xl ring-1 ring-gray-100">
            🔒
          </div>
          <h1 className="text-lg font-bold text-gray-900">认证服务未配置</h1>
          <p className="mt-2 text-sm text-gray-500">
            请在部署环境变量中设置 <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-red-500">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full border border-gray-200 px-5 py-2 text-sm font-medium text-gray-600 transition hover:border-red-300 hover:text-red-500"
          >
            ← 返回首页
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
      <SignUp
        appearance={{
          elements: {
            card: 'shadow-xl border border-gray-100',
            formButtonPrimary: 'bg-red-500 hover:bg-red-600 text-sm',
            headerTitle: 'text-gray-900',
            headerSubtitle: 'text-gray-400',
          },
        }}
      />
    </div>
  );
}
