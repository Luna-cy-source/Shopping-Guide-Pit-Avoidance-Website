'use client';

import { useState, useEffect } from 'react';
import { useBookmarks } from '../hooks/useBookmarks';

// ============================================
// BookmarkButton — 收藏/取消收藏此报告
//
// 用于报告页，点击后将当前 URL 和产品名存入 localStorage
// ============================================
interface BookmarkButtonProps {
  productName: string;
  reportPath: string; // 如 "/report/iPhone17"
}

export default function BookmarkButton({ productName, reportPath }: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, mounted } = useBookmarks();
  const [justSaved, setJustSaved] = useState(false);
  const bookmarked = mounted && isBookmarked(reportPath);

  // 收藏成功后短暂展示 "已收藏" 提示
  useEffect(() => {
    if (justSaved) {
      const timer = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justSaved]);

  // 如果还在加载，显示占位避免 layout shift
  if (!mounted) {
    return (
      <span className="inline-flex h-9 w-[112px] animate-pulse rounded-lg bg-gray-100" />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        toggleBookmark(reportPath, productName);
        setJustSaved(true);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
        bookmarked
          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-600'
      }`}
      title={bookmarked ? '取消收藏' : '收藏此报告'}
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
      {justSaved ? '已收藏' : bookmarked ? '取消收藏' : '收藏此报告'}
    </button>
  );
}
