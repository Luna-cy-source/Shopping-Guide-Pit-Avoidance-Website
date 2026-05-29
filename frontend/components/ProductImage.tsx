'use client';

import { useState, useCallback } from 'react';

// ============================================
// Props
// ============================================
interface ProductImageProps {
  /** 图片源 URL — 可能是 /api/image-proxy 代理链接、原始直链、或特殊标记 */
  src: string;
  /** 图片 alt 文本 */
  alt: string;
  /** 额外 class */
  className?: string;
  /** 是否展示占位容器边框动画（流式加载中） */
  isStreaming?: boolean;
}

// ============================================
// 工具：判断是否为有效可渲染的图片源
// ============================================
function isRenderableUrl(src: string): boolean {
  if (!src) return false;
  const lower = src.trim().toLowerCase();
  // 大模型明确标记无图
  if (lower === 'null' || lower === 'fallback') return false;
  if (lower.startsWith('null') || lower.startsWith('fallback')) return false;
  // 必须是 http / https / /api/image-proxy 开头
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('/api/image-proxy')
  );
}

// ============================================
// 优雅占位 UI（ImageOff 图标 + 提示文字）
// ============================================
function ImageFallback({
  alt,
  className = '',
}: {
  alt: string;
  className?: string;
}) {
  const productName = alt && alt !== '产品图片' ? alt : '';
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
      style={{ minHeight: 180 }}
    >
      {/* 产品图标 */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-3xl">
        📦
      </div>

      {/* 产品名称 */}
      {productName ? (
        <p className="mt-3 max-w-[220px] truncate px-4 text-center text-sm font-semibold text-gray-700">
          {productName}
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-gray-500">产品信息</p>
      )}

      {/* 状态提示 */}
      <p className="mt-1 text-xs text-gray-400">
        AI 实时检索分析中
      </p>

      {/* 模拟进度点 */}
      <div className="mt-3 flex items-center gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ============================================
// 主组件：ProductImage
//
// 核心防错机制：
//   1. url 为 'null'/'fallback'/空 → 直接渲染占位 UI
//   2. <img> onError → 切换为占位 UI
//   3. 加载成功 → 圆角卡片 + 微弱阴影
// ============================================
export default function ProductImage({
  src,
  alt,
  className = '',
  isStreaming = false,
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // ── 降级判断：url 明确标记无图、或空值 ──
  const canRender = isRenderableUrl(src);

  if (!canRender || hasError) {
    return (
      <ImageFallback
        alt={alt}
        className={`animate-fade-in-up ${className}`}
      />
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className={`mx-auto block max-h-60 w-full object-contain p-4 transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onError={handleError}
        onLoad={handleLoad}
      />

      {/* 加载态：流式传输中在图片区域显示骨架 */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-50/80">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
        </div>
      )}

      {/* 流式传输中的光标指示器 */}
      {isStreaming && isLoaded && (
        <span className="absolute bottom-2 right-3 inline-block h-4 w-0.5 animate-blink-cursor rounded-full bg-red-400" />
      )}
    </div>
  );
}
