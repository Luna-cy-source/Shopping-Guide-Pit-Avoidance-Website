'use client';

import { useState, useEffect } from 'react';
import { useBookmarks, BookmarkType } from '../hooks/useBookmarks';
import Link from 'next/link';

// ============================================
// BookmarkButton — 通用收藏按钮
// 支持：报告页 / 二手防坑 / 选品诊所
// ============================================
interface BookmarkButtonProps {
  productName: string;
  reportPath: string;     // 当前页面 URL 路径
  type?: BookmarkType;    // 收藏类型，默认 report
  compact?: boolean;      // 紧凑模式（小尺寸）
}

const TYPE_LABELS: Record<BookmarkType, { label: string; saved: string; hint: string }> = {
  report:   { label: '收藏此报告', saved: '已收藏',   hint: '收藏此避坑报告' },
  used_check: { label: '收藏鉴定', saved: '已收藏',   hint: '收藏此鉴定结果' },
  clinic:   { label: '收藏推荐', saved: '已收藏',   hint: '收藏此推荐方案' },
};

export default function BookmarkButton({ productName, reportPath, type = 'report', compact }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, mounted } = useBookmarks();
  const [justSaved, setJustSaved] = useState(false);
  const bookmarked = mounted && isBookmarked(reportPath);

  useEffect(() => {
    if (justSaved) {
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justSaved]);

  // 加载占位
  if (!mounted) {
    return (
      <span className={`inline-flex animate-pulse rounded-lg bg-gray-100 ${compact ? 'h-8 w-[80px]' : 'h-9 w-[112px]'}`} />
    );
  }

  const labels = TYPE_LABELS[type];
  const sizeClass = compact
    ? 'px-3 py-1.5 text-xs gap-1'
    : 'px-3.5 py-2 text-sm gap-1.5';

  return (
    <button
      type="button"
      onClick={() => {
        toggleBookmark(reportPath, productName, type);
        setJustSaved(true);
      }}
      className={`inline-flex items-center rounded-lg border font-medium transition-all active:scale-95 ${sizeClass} ${
        bookmarked
          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600'
      }`}
      title={bookmarked ? `取消收藏` : labels.hint}
    >
      <svg
        className={`h-4 w-4 ${justSaved && !bookmarked ? 'animate-bounce' : ''}`}
        fill={bookmarked ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={bookmarked ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"
        />
      </svg>
      {justSaved ? labels.saved : bookmarked ? '取消收藏' : labels.label}
    </button>
  );
}

// ============================================
// BackButton — 返回首页按钮（带收藏）
// 用于二手防坑、选品诊所等子页面顶部
// ============================================
interface TopBarProps {
  backLabel?: string;
  showBookmark?: boolean;
  bookmarkName?: string;
  bookmarkUrl?: string;
  bookmarkType?: BookmarkType;
}

export function TopBar({
  backLabel = '返回首页',
  showBookmark,
  bookmarkName = '',
  bookmarkUrl = '',
  bookmarkType = 'report',
}: TopBarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {/* 左侧：返回按钮 */}
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
      >
        <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {backLabel}
      </Link>

      {/* 右侧：收藏按钮 */}
      {showBookmark && bookmarkName && bookmarkUrl && (
        <BookmarkButton
          productName={bookmarkName}
          reportPath={bookmarkUrl}
          type={bookmarkType}
          compact
        />
      )}
    </div>
  );
}
