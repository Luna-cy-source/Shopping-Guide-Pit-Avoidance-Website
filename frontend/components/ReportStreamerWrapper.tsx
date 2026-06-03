'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { ReportStreamer } from './ReportStreamer';

// ============================================
// ReportStreamerWrapper — 客户端组件
// 用 ErrorBoundary 包裹 ReportStreamer，防止流式渲染异常导致整页白屏
// ============================================
interface ReportStreamerWrapperProps {
  query: string;
  onDataReady?: (data: any) => void;
}

export default function ReportStreamerWrapper({ query, onDataReady }: ReportStreamerWrapperProps) {
  return (
    <ErrorBoundary query={query}>
      <ReportStreamer query={query} onDataReady={onDataReady} />
    </ErrorBoundary>
  );
}
