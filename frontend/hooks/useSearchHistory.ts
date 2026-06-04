'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// 类型定义
// ============================================
export interface SearchHistoryItem {
  query: string;
  timestamp: number; // Date.now()
}

const KEY_PREFIX = 'aibigeng_search_history';
const MAX_ITEMS = 10;

function getStorageKey(userId: string): string {
  return userId ? `${KEY_PREFIX}_${userId}` : KEY_PREFIX;
}

// ============================================
// Hook: useSearchHistory
// - 按用户隔离存储（传入 userId）
// - 最多保存 10 条
// - 包含搜索词和对应的时间戳
// - 自动去重（同一搜索词只保留最新一条）
// ============================================
export function useSearchHistory(userId?: string) {
  const uid = userId || '';
  const storageKey = useRef(getStorageKey(uid)).current;
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // ---- 挂载/切换用户时从 localStorage 读取 ----
  useEffect(() => {
    const key = getStorageKey(uid);
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as SearchHistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_ITEMS));
          setMounted(true);
          return;
        }
      }
    } catch {
      // localStorage 解析失败，忽略
    }
    setHistory([]);
    setMounted(true);
  }, [uid]);

  // ---- 添加搜索记录（去重 + 限制条数）----
  const addHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const key = getStorageKey(uid);
    setHistory((prev) => {
      // 去重：移除已存在的相同搜索词
      const filtered = prev.filter((item) => item.query !== trimmed);
      // 新记录插到最前面
      const next = [
        { query: trimmed, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);

      // 持久化到 localStorage
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // 写入失败忽略
      }

      return next;
    });
  }, [uid]);

  // ---- 清空历史 ----
  const clearHistory = useCallback(() => {
    const key = getStorageKey(uid);
    setHistory([]);
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [uid]);

  // ---- 删除单条 ----
  const removeHistoryItem = useCallback((query: string) => {
    const key = getStorageKey(uid);
    setHistory((prev) => {
      const next = prev.filter((item) => item.query !== query);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [uid]);

  return {
    history,
    mounted,
    addHistory,
    clearHistory,
    removeHistoryItem,
    hasHistory: history.length > 0,
  };
}
