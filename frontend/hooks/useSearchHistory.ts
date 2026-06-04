'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { initCloudBase, isCloudReady, saveSearchHistory, loadSearchHistory } from '@/lib/cloudbase-storage';

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

  // ---- 挂载/切换用户时从 localStorage + 云端读取 ----
  useEffect(() => {
    const key = getStorageKey(uid);
    // 先读本地
    let loaded = false;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as SearchHistoryItem[];
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_ITEMS));
          setMounted(true);
          loaded = true;
        }
      }
    } catch { /* ignore */ }

    if (!loaded) {
      setHistory([]);
      setMounted(true);
    }

    // ★ 后台尝试从云端拉取最新数据
    if (uid) {
      initCloudBase().then(() => {
        if (!isCloudReady()) return;
        loadSearchHistory(uid).then(cloudItems => {
          if (cloudItems && cloudItems.length > 0) {
            setHistory(prev => {
              // 云端数据更新或本地为空时使用云端
              if (prev.length === 0 || cloudItems.length >= prev.length) {
                try { localStorage.setItem(key, JSON.stringify(cloudItems.slice(0, MAX_ITEMS))); } catch {}
                return cloudItems.slice(0, MAX_ITEMS);
              }
              return prev;
            });
          }
        }).catch(() => {});
      });
    }
  }, [uid]);

  // ---- 添加搜索记录（去重 + 限制条数）----
  const addHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const key = getStorageKey(uid);
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.query !== trimmed);
      const next = [
        { query: trimmed, timestamp: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);

      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}

      // ★ 同步到云端
      if (uid) saveSearchHistory(uid, next).catch(() => {});

      return next;
    });
  }, [uid]);

  // ---- 清空历史 ----
  const clearHistory = useCallback(() => {
    const key = getStorageKey(uid);
    setHistory([]);
    try { localStorage.removeItem(key); } catch {}
    if (uid) saveSearchHistory(uid, []).catch(() => {});
  }, [uid]);

  // ---- 删除单条 ----
  const removeHistoryItem = useCallback((query: string) => {
    const key = getStorageKey(uid);
    setHistory((prev) => {
      const next = prev.filter((item) => item.query !== query);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      if (uid) saveSearchHistory(uid, next).catch(() => {});
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
