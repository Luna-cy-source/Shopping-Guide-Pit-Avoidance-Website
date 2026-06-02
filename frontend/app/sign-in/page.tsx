'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthResult } from '../../hooks/useAuth';

export default function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result: AuthResult = await login(username.trim(), password);
      if (result.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4">
      <div className="w-full max-w-[360px] rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-black/5">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 text-2xl text-white shadow-lg shadow-red-200">
            🛡️
          </div>
          <h1 className="text-lg font-bold text-gray-900">欢迎回来</h1>
          <p className="mt-1 text-xs text-gray-400">登录 AI 避坑实验室</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-medium text-gray-600">
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-600">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full rounded-xl bg-gradient-to-r from-red-500 to-pink-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-200 transition-all hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                登录中...
              </span>
            ) : '登 录'}
          </button>
        </form>

        {/* 底部链接 */}
        <p className="mt-6 text-center text-xs text-gray-400">
          还没有账号？{' '}
          <Link href="/sign-up" className="font-semibold text-purple-500 transition-colors hover:text-purple-600">
            立即注册
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-gray-400 transition-colors hover:text-gray-600">
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
