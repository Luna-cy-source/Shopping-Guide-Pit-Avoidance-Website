'use client';

import { Component, type ReactNode } from 'react';

// ============================================
// ErrorBoundary — 防止流式渲染异常导致整页白屏
//
// 捕获策略：
//   1. 渲染错误 → 展示友好降级 UI + 重试按钮
//   2. 保留已渲染的部分内容（React 组件树在错误前的内容不受影响）
//
// 使用方式：包裹 ReportStreamer 组件
//   <ErrorBoundary query={decodedQuery}>
//     <ReportStreamer query={decodedQuery} />
//   </ErrorBoundary>
// ============================================

interface Props {
  children: ReactNode;
  /** 用户当前查询词，用于重试时导航 */
  query?: string;
  /** 可选的额外错误描述回调 */
  onError?: (error: Error, errorInfo: string) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 上报错误（生产环境可接入 Sentry 等）
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, errorInfo.componentStack);

    // 触发外部回调
    this.props.onError?.(error, errorInfo.componentStack ?? '');
  }

  handleReset = () => {
    // 重置错误状态，尝试重新渲染
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    // 硬重置：刷新页面
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
            {/* 警告图标 */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-7 w-7 text-amber-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-amber-800">页面渲染异常</h2>
            <p className="mt-2 text-sm text-amber-600">
              分析过程中遇到了意外状况，AI 实验室正在努力修复中。您可以尝试重新加载页面。
            </p>

            {/* 错误详情（仅开发环境展示） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 rounded-lg border border-amber-200 bg-white p-3 text-left">
                <summary className="cursor-pointer text-xs font-medium text-amber-500">
                  错误详情（开发模式）
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600">
                  {this.state.error.message}
                  {this.state.error.stack
                    ? `\n\n${this.state.error.stack}`
                    : ''}
                </pre>
              </details>
            )}

            {/* 操作按钮 */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-[0.98]"
              >
                重新分析
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98]"
              >
                刷新页面
              </button>
            </div>

            {/* 底部提示 */}
            <p className="mt-4 text-xs text-amber-400">
              如问题持续出现，稍等片刻后重试或尝试搜索其他商品。
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
