/* version: v3 - username-only registration (EmailLogin disabled) */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthResult } from '../../hooks/useAuth';

const RANDOM_NICKNAMES = [
  '避坑新手', '精明买家', '理性消费者', '价格侦探', '品质猎人',
  '省钱达人', '识货行家', '购物老手', '防坑专家', '比价小能手',
];

export default function SignUpPage() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  // 随机昵称建议
  const suggestNickname = () => {
    const pick = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    setNickname(pick);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    if (password.length < 4) {
      setError('密码至少需要4个字符');
      return;
    }

    setLoading(true);

    try {
      const result: AuthResult = await register(
        username.trim(),
        password,
        nickname.trim() || undefined,
      );
      if (result.success) {
        // 注册成功 → 显示成功提示，延迟跳转
        setSuccess(true);
        setTimeout(() => router.push('/sign-in?registered=1'), 1500);
      } else {
        setError(result.error || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-gray-50 p-4 py-8">
      <div className="w-full max-w-[380px] rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-black/5">
        {/* Logo */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 text-2xl text-white shadow-lg shadow-purple-200">
            ✨
          </div>
          <h1 className="text-lg font-bold text-gray-900">创建账号</h1>
          <p className="mt-1 text-xs text-gray-400">加入 AI 避坑实验室，开始聪明消费</p>
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="mb-4 animate-in fade-in rounded-lg bg-green-50 px-4 py-3 text-center">
            <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-green-700">注册成功！</p>
            <p className="mt-0.5 text-xs text-green-600">正在跳转到登录页...</p>
          </div>
        )}

        {/* 错误提示 */}
        {error && !success && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
            {error}
          </div>
        )}

        {/* 表单 */}
        <form onSubmit={handleSubmit} className={`space-y-3.5 ${success ? 'pointer-events-none opacity-40' : ''}`}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              用户名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="字母、数字、下划线或中文"
              required
              minLength={2}
              maxLength={20}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">昵称（选填）</label>
              <button
                type="button"
                onClick={suggestNickname}
                className="text-[10px] text-purple-500 transition-colors hover:text-purple-600"
              >
                🎲 随机一个
              </button>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="显示给其他用户的名称"
              maxLength={16}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              密码 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少4个字符"
              required
              minLength={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              确认密码 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              required
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all placeholder:text-gray-300 focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-200 transition-all hover:shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                注册中...
              </span>
            ) : '注 册'}
          </button>
        </form>

        {/* 底部链接 */}
        <p className="mt-6 text-center text-xs text-gray-400">
          已有账号？{' '}
          <Link href="/sign-in" className="font-semibold text-purple-500 transition-colors hover:text-purple-600">
            立即登录
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
