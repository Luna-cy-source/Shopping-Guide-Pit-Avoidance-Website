'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../lib/api';
import {
  initCloudBase,
  isCloudReady,
  adminListAllUsers,
  adminDeleteUser,
  adminGetUserHistory,
  adminGetUserBookmarks,
} from '@/lib/cloudbase-storage';
import type { AdminUserItem } from '@/lib/cloudbase-storage';

// ============================================
// 类型定义
// ============================================
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

type MainTab = 'expose' | 'users';

type ExposeTab = 'pending' | 'verified' | 'rejected';

const statusLabel: Record<ExposeTab, string> = {
  pending: '待审核',
  verified: '已通过',
  rejected: '已拒绝',
};

const statusColor: Record<ExposeTab, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  verified: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
};

function formatTime(ts: number): string {
  if (!ts) return '未知';
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

function formatDate(ts: number): string {
  if (!ts) return '未知';
  return new Date(ts).toLocaleString('zh-CN');
}

const levelLabel = (level: number): string => {
  const labels = ['', '新手', '初窥', '入门', '熟手', '达人', '专家', '大师', '宗师'];
  return labels[level] || `Lv.${level}`;
};

// ============================================
// 审核管理面板
// ============================================
function ExposePanel() {
  const [tab, setTab] = useState<ExposeTab>('pending');
  const [posts, setPosts] = useState<ExposePost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async (status: ExposeTab) => {
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

  useEffect(() => { fetchPosts(tab); }, [tab, fetchPosts]);

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

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">📋 曝光审核管理</h2>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {(Object.keys(statusLabel) as ExposeTab[]).map((key) => (
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

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

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
              <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate">{post.productName}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium border ${statusColor[post.status as ExposeTab] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
                        {statusLabel[post.status as ExposeTab] || post.status}
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
  );
}

// ============================================
// 用户管理面板
// ============================================
function UsersPanel() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [userHistory, setUserHistory] = useState<{ query: string; timestamp: number }[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await initCloudBase();
      if (!isCloudReady()) {
        setError('CloudBase 未连接，请检查网络后重试');
        return;
      }
      const list = await adminListAllUsers();
      setUsers(list);
    } catch (e) {
      setError('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openDetail = async (user: AdminUserItem) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      await initCloudBase();
      const [history, bookmarks] = await Promise.all([
        adminGetUserHistory(user.username),
        adminGetUserBookmarks(user.username),
      ]);
      setUserHistory(history);
      setUserBookmarks(bookmarks);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (username: string) => {
    setConfirmDelete(null);
    await initCloudBase();
    const ok = await adminDeleteUser(username);
    if (ok) {
      setUsers((prev) => prev.filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
      if (selectedUser?.username.toLowerCase() === username.toLowerCase()) {
        setSelectedUser(null);
      }
    } else {
      setError('删除失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">👥 用户管理</h2>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors"
        >
          🔄 刷新
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-20 text-slate-500">加载中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-slate-500">暂无注册用户</div>
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">共 {users.length} 名用户</p>

          {/* 用户列表表格 */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/80 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">头像</th>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">昵称</th>
                  <th className="px-4 py-3 font-medium">等级</th>
                  <th className="px-4 py-3 font-medium">经验值</th>
                  <th className="px-4 py-3 font-medium">注册时间</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                      selectedUser?._id === user._id ? 'bg-slate-800/80' : ''
                    }`}
                    onClick={() => openDetail(user)}
                  >
                    <td className="px-4 py-3 text-xl">{user.avatar || '👤'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{user.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{user.nickname || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {levelLabel(user.level)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{user.xp} XP</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {confirmDelete === user.username ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(user.username)}
                            className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1 rounded-lg bg-slate-700 text-slate-400 text-xs"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDelete(user.username); }}
                          className="px-3 py-1 rounded-lg bg-transparent hover:bg-red-600/20 text-red-400 text-xs border border-red-600/30 transition-colors"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 用户详情面板 */}
          {selectedUser && (
            <div className="mt-6 p-5 rounded-2xl bg-slate-900 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                  <span className="text-2xl">{selectedUser.avatar || '👤'}</span>
                  {selectedUser.nickname || selectedUser.username}
                  <span className="text-sm text-slate-400 font-normal">@{selectedUser.username}</span>
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  ✕ 关闭
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{selectedUser.level}</div>
                  <div className="text-xs text-slate-400 mt-1">等级</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{selectedUser.xp}</div>
                  <div className="text-xs text-slate-400 mt-1">经验值</div>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{formatDate(selectedUser.createdAt)}</div>
                  <div className="text-xs text-slate-400 mt-1">注册时间</div>
                </div>
              </div>

              {detailLoading ? (
                <div className="text-center py-10 text-slate-500">加载详情...</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {/* 搜索历史 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">
                      📜 搜索记录 ({userHistory.length})
                    </h4>
                    {userHistory.length === 0 ? (
                      <p className="text-xs text-slate-500">暂无搜索记录</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {userHistory.slice().sort((a, b) => b.timestamp - a.timestamp).map((h, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 text-sm">
                            <span className="text-slate-200 truncate">{h.query}</span>
                            <span className="text-xs text-slate-500 shrink-0 ml-2">{formatTime(h.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 收藏列表 */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">
                      ⭐ 收藏 ({userBookmarks.length})
                    </h4>
                    {userBookmarks.length === 0 ? (
                      <p className="text-xs text-slate-500">暂无收藏</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {userBookmarks.map((b, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/50 text-sm">
                            <span className="text-slate-200 truncate">{b.productName || b.url || '未命名'}</span>
                            <span className="text-xs text-slate-500 shrink-0 ml-2">{b.type || 'report'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================
// 主管理后台页面
// ============================================
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('expose');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError('');
    } else {
      setError('密码错误');
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
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">🔐 管理后台</h1>
            <nav className="flex gap-1">
              <button
                onClick={() => setMainTab('expose')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mainTab === 'expose'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                📋 曝光审核
              </button>
              <button
                onClick={() => setMainTab('users')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  mainTab === 'users'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                👥 用户管理
              </button>
            </nav>
          </div>
          <button
            onClick={() => setAuthed(false)}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            退出
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {mainTab === 'expose' ? <ExposePanel /> : <UsersPanel />}
      </div>
    </div>
  );
}
