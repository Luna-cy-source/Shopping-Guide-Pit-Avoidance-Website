'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// 类型定义
// ============================================
export interface BookmarkItem {
  url: string;         // 页面 URL 路径
  productName: string; // 标题/商品名
  savedAt: number;     // Date.now()
  type: BookmarkType;  // 收藏类型
  reportData?: any;    // 存储的报告/结果完整数据（用于直接渲染）
}

export type BookmarkType = 'report' | 'used_check' | 'clinic';

const STORAGE_KEY = 'aibigeng_bookmarks';
const MAX_ITEMS = 30;

// ============================================
// Hook: useBookmarks
// 支持：报告页/二手防坑/选品诊所 三种类型收藏
// ============================================
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BookmarkItem[];
        if (Array.isArray(parsed)) {
          setBookmarks(parsed.slice(0, MAX_ITEMS));
        }
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const addBookmark = useCallback((url: string, productName: string, type: BookmarkType = 'report', reportData?: any) => {
    if (!url || !productName) return;
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.url === url);
      // 已收藏时更新报告数据
      if (existing) {
        if (reportData && !existing.reportData) {
          const next = prev.map((b) =>
            b.url === url ? { ...b, reportData } : b
          );
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        }
        return prev;
      }
      const next = [
        { url, productName: productName.trim(), savedAt: Date.now(), type, ...(reportData ? { reportData } : {}) },
        ...prev,
      ].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeBookmark = useCallback((url: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const toggleBookmark = useCallback(
    (url: string, productName: string, type: BookmarkType = 'report', reportData?: any) => {
      if (isBookmarked(url)) removeBookmark(url);
      else addBookmark(url, productName, type, reportData);
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // 按类型筛选
  const getBookmarksByType = useCallback(
    (type: BookmarkType) => bookmarks.filter((b) => b.type === type),
    [bookmarks]
  );

  return {
    bookmarks,
    mounted,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearBookmarks,
    hasBookmarks: bookmarks.length > 0,
    getBookmarksByType,
  };
}
