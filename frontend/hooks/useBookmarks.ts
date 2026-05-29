'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// 类型定义
// ============================================
export interface BookmarkItem {
  url: string;        // 报告页 URL 路径，如 /report/iPhone17ProMax
  productName: string; // 商品名
  savedAt: number;    // Date.now()
}

const STORAGE_KEY = 'aibigeng_bookmarks';
const MAX_ITEMS = 20;

// ============================================
// Hook: useBookmarks
//
// 利用 localStorage 封装收藏报告的存取逻辑
// - 最多保存 20 条
// - 包含 URL、产品名和保存时间戳
// - 自动去重（同一 URL 不重复收藏）
// ============================================
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // ---- 挂载时从 localStorage 读取 ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BookmarkItem[];
        if (Array.isArray(parsed)) {
          setBookmarks(parsed.slice(0, MAX_ITEMS));
        }
      }
    } catch {
      // ignore
    }
    setMounted(true);
  }, []);

  // ---- 检查某 URL 是否已收藏 ----
  const isBookmarked = useCallback(
    (url: string) => {
      return bookmarks.some((b) => b.url === url);
    },
    [bookmarks]
  );

  // ---- 添加收藏 ----
  const addBookmark = useCallback((url: string, productName: string) => {
    if (!url || !productName) return;
    setBookmarks((prev) => {
      // 已存在则跳过
      if (prev.some((b) => b.url === url)) return prev;
      const next = [
        { url, productName: productName.trim(), savedAt: Date.now() },
        ...prev,
      ].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ---- 取消收藏 ----
  const removeBookmark = useCallback((url: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // ---- 切换收藏状态 ----
  const toggleBookmark = useCallback(
    (url: string, productName: string) => {
      if (isBookmarked(url)) {
        removeBookmark(url);
      } else {
        addBookmark(url, productName);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  // ---- 清空收藏 ----
  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    bookmarks,
    mounted,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    clearBookmarks,
    hasBookmarks: bookmarks.length > 0,
  };
}
