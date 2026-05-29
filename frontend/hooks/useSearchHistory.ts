'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// 类型定义
// ============================================
export interface SearchHistoryItem {
  query: string;
  timestamp: number; // Date.now()
}

const STORAGE_KEY = 'aibigeng_search_history';
const MAX_ITEMS = 10;

// ============================================
// Hook: useSearchHistory
//
// 利用 localStorage 封装对用户搜索记录的存取逻辑
// - 最多保存 10 条
// - 包含搜索词和对应的时间戳
// - 自动去重（同一搜索词只保留最新一条）
// ============================================
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // ---- 挂载时从 localStorage 读取 ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SearchHistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_ITEMS));
        }
      }
    } catch {
      // localStorage 解析失败，忽略
    }
    setMounted(true);
  }, []);

  // ---- 添加搜索记录（去重 + 限制条数）----
  const addHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // 写入失败忽略
      }

      return next;
    });
  }, []);

  // ---- 清空历史 ----
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // ---- 删除单条 ----
  const removeHistoryItem = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.query !== query);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    history,
    mounted,
    addHistory,
    clearHistory,
    removeHistoryItem,
    hasHistory: history.length > 0,
  };
}
