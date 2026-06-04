'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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

const KEY_PREFIX = 'aibigeng_bookmarks';
const MAX_ITEMS = 30;

function getStorageKey(userId: string): string {
  return userId ? `${KEY_PREFIX}_${userId}` : KEY_PREFIX;
}

// ============================================
// Hook: useBookmarks（按用户隔离存储）
// ============================================
export function useBookmarks(userId?: string) {
  const uid = userId || '';
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const key = getStorageKey(uid);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as BookmarkItem[];
        if (Array.isArray(parsed)) {
          setBookmarks(parsed.slice(0, MAX_ITEMS));
          setMounted(true);
          return;
        }
      }
    } catch { /* ignore */ }
    setBookmarks([]);
    setMounted(true);
  }, [uid]);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const addBookmark = useCallback((url: string, productName: string, type: BookmarkType = 'report', reportData?: any) => {
    if (!url || !productName) return;
    const key = getStorageKey(uid);
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.url === url);
      if (existing) {
        if (reportData && !existing.reportData) {
          const next = prev.map((b) =>
            b.url === url ? { ...b, reportData } : b
          );
          try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
          return next;
        }
        return prev;
      }
      const next = [
        { url, productName: productName.trim(), savedAt: Date.now(), type, ...(reportData ? { reportData } : {}) },
        ...prev,
      ].slice(0, MAX_ITEMS);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [uid]);

  const removeBookmark = useCallback((url: string) => {
    const key = getStorageKey(uid);
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [uid]);

  const toggleBookmark = useCallback(
    (url: string, productName: string, type: BookmarkType = 'report', reportData?: any) => {
      if (isBookmarked(url)) removeBookmark(url);
      else addBookmark(url, productName, type, reportData);
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  const clearBookmarks = useCallback(() => {
    const key = getStorageKey(uid);
    setBookmarks([]);
    try { localStorage.removeItem(key); } catch {}
  }, [uid]);

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
