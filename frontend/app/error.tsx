'use client';

/**
 * 全局错误边界 — 捕获所有未处理的客户端异常
 *
 * 当任何组件（Header、AuthProvider、SDK初始化等）抛出异常时，
 * 展示友好的错误页面，而不是白屏 "Application error"。
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError] 全局异常捕获:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 antialiased">
        <div className="w-full max-w-md text-center">
          {/* 图标 */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 shadow-sm">
            <svg
              className="h-10 w-10 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-800">页面加载遇到了问题</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            AI 避坑实验室正在自动修复，您可以尝试以下操作：
          </p>

          {/* 操作按钮 */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl bg-red-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 active:scale-[0.98]"
            >
              重试加载
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              刷新页面
            </button>
          </div>

          {/* 错误详情（可展开） */}
          <details className="mx-auto mt-8 max-w-sm text-left">
            <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
              技术详情（点击展开）
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-600">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>

          <p className="mt-6 text-xs text-slate-300">
            如问题持续出现，请稍后重试或更换浏览器访问
          </p>
        </div>
      </body>
    </html>
  );
}
