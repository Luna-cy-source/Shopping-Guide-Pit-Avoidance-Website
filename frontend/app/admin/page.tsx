'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../lib/api';

interface ExposePost {
  id: number | string;
  productName: string;
  pitTitle: string;
  description?: string | null;
  voteCount: number;
  createdAt: number;
  status: string;
}

const ADMIN_PASSWORD = 'admin123';

type TabKey = 'pending' | 'verified' | 'rejected';

const statusLabel: Record<TabKey, string> = {
  pending: '待审核',
  verified: '已通过',
  rejected: '已拒绝',
};

const statusColor: Record<TabKey, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  verified: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<TabKey>('pending');
  const [posts, setPosts] = useState<ExposePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async (status: TabKey) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/admin/expose?status=${status}&limit=100`));
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
        setTotal(data.total ?? data.posts.length);
      } else {
        setError(data.error || '加载失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchPosts(tab);
  }, [authed, tab, fetchPosts]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('密码错误');
    }
  };

  const handleReview = async (id: number | string, status: 'verified' | 'rejected') => {
    try {
      const res = await fetch(apiUrl(`/api/admin/expose/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts(tab);
      } else {
        setError(data.error || '操作失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  // 未登录 → 密码输入框
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-white text-center mb-6">🔐 管理后台</h1>
          <input
            type="password"
            placeholder="请输入管理密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 mb-4"
          />
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            登录
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 顶部栏 */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">🔐 审核管理后台</h1>
          <button
            onClick={() => setAuthed(false)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(statusLabel) as TabKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {statusLabel[key]}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 列表 */}
        {loading ? (
          <div className="text-center py-20 text-slate-500">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            {tab === 'pending' ? '暂无待审核帖子 🎉' : '暂无数据'}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-3">共 {total} 条</p>
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {post.productName}
                        </span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium border ${statusColor[post.status as TabKey] || 'bg-slate-700 text-slate-300 border-slate-600'}`}
                        >
                          {statusLabel[post.status as TabKey] || post.status}
                        </span>
                      </div>
                      <p className="text-sm text-blue-400 font-medium mb-1">{post.pitTitle}</p>
                      {post.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">{post.description}</p>
                      )}
                      <p className="text-xs text-slate-600 mt-2">
                        {formatTime(post.createdAt)} · {post.voteCount} 票
                      </p>
                    </div>

                    {/* 待审核才显示操作按钮 */}
                    {post.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleReview(post.id, 'verified')}
                          className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
                        >
                          ✅ 通过
                        </button>
                        <button
                          onClick={() => handleReview(post.id, 'rejected')}
                          className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-medium border border-red-600/30 transition-colors"
                        >
                          ❌ 拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
