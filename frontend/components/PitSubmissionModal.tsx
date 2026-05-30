'use client';

import { useState } from 'react';
import { useAuth, SignInButton } from '@clerk/clerk-react';

// =====================================================
// 避坑线索提交弹窗（仅登录用户可提交）
// =====================================================
interface Props {
  productName: string;
}

export default function PitSubmissionModal({ productName }: Props) {
  const { isSignedIn, userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [pitTitle, setPitTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setPitTitle('');
    setDescription('');
    setError('');
    setSubmitting(false);
    setDone(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!pitTitle.trim() || !description.trim()) {
      setError('标题和描述不能为空');
      return;
    }
    if (!userId) {
      setError('请先登录');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787'}/api/pit-submission`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            productName,
            pitTitle: pitTitle.trim(),
            description: description.trim(),
          }),
        }
      );
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? '提交失败');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* ---- 触发按钮 ---- */}
      <button
        onClick={() => {
          resetForm();
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-100 hover:border-red-300 active:scale-95"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        发现新套路？补充避坑线索
      </button>

      {/* ---- 弹窗 ---- */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">补充避坑线索</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 未登录 → 引导登录 */}
            {!isSignedIn ? (
              <div className="text-center py-6">
                <p className="mb-4 text-sm text-gray-500">登录后才能提交线索</p>
                <SignInButton mode="modal">
                  <button className="rounded-full bg-red-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-600">
                    登录 / 注册
                  </button>
                </SignInButton>
              </div>
            ) : done ? (
              /* 提交成功 */
              <div className="text-center py-8">
                <svg className="mx-auto mb-3 h-12 w-12 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-base font-semibold text-gray-900">提交成功</p>
                <p className="mt-1 text-sm text-gray-500">实验室正在核实中，感谢你的贡献！</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  关闭
                </button>
              </div>
            ) : (
              /* 已登录 → 表单 */
              <div className="space-y-4">
                {/* 检测商品（只读） */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">检测商品</label>
                  <input
                    type="text"
                    readOnly
                    value={productName}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 outline-none"
                  />
                </div>

                {/* 坑点标题 */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    坑点标题 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例如：充电口松动是个通病"
                    maxLength={100}
                    value={pitTitle}
                    onChange={(e) => setPitTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-1 focus:ring-red-100"
                  />
                </div>

                {/* 描述 */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    详细描述 <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    placeholder="尽量详细地描述你遇到的坑、使用场景、以及为什么这是坑..."
                    maxLength={2000}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-1 focus:ring-red-100"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">
                    {description.length}/2000
                  </p>
                </div>

                {/* 错误提示 */}
                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{error}</p>
                )}

                {/* 提交按钮 */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full rounded-full bg-red-500 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? '提交中...' : '提交线索'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  仅供产品核验，不会公开展示
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
