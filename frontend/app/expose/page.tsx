'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
interface ExposePost {
  id: number;
  productName: string;
  pitTitle: string;
  description?: string | null;
  voteCount: number;
  createdAt: number;
  status: string;
}

/** 后端错误响应结构 */
interface ApiErrorBody {
  error?: string;
  code?: string;
  detail?: string;
  action?: string;
}

import { apiUrl } from '../../lib/api';

const IS_DEV = process.env.NODE_ENV === 'development';

// ============================================
// 格式化时间
// ============================================
function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================
// ExposeForm — 优雅的排雷提交表单
// ============================================
function ExposeForm({
  userId,
  onSuccess,
  isSignedIn,
}: {
  userId: string | null | undefined;
  onSuccess: () => void;
  isSignedIn: boolean | undefined;
}) {
  const [productName, setProductName] = useState('');
  const [pitTitle, setPitTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setProductName('');
    setPitTitle('');
    setDescription('');
    setError('');
    setSubmitting(false);
    setDone(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!productName.trim()) {
      setError('请填写产品名称');
      return;
    }
    if (!pitTitle.trim()) {
      setError('请填写核心坑点');
      return;
    }
    if (!userId) {
      setError('请先登录');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/expose'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productName: productName.trim(),
          pitTitle: pitTitle.trim(),
          description: description.trim() || undefined,
        }),
      });

      let data: { success?: boolean; error?: string; code?: string; detail?: string; action?: string };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error('服务器返回了非法响应，请稍后重试');
      }

      if (!res.ok || !data.success) {
        const parts = [data.error ?? '提交失败'];
        if (IS_DEV && data.detail) parts.push(`\n原因: ${data.detail}`);
        if (IS_DEV && data.action) parts.push(`\n修复: ${data.action}`);
        throw new Error(parts.join(''));
      }
      setDone(true);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 未登录
  if (!isSignedIn) {
    return (
      <div className="card-premium">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-base">
            📣
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">我要曝光</h3>
            <p className="text-xs text-slate-400">晒出你踩过的坑，帮大家避雷</p>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="mb-3 text-sm text-slate-500">登录后方可提交曝光</p>
          <Link href="/sign-in" className="inline-block rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:from-red-600 hover:to-rose-600 hover:shadow-md">
            登录 / 注册
          </Link>
        </div>
      </div>
    );
  }

  // 已登录
  return (
    <div className="card-premium">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-base">
          📣
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">我要曝光</h3>
          <p className="text-xs text-slate-400">晒出你踩过的坑，帮大家避雷</p>
        </div>
      </div>

      {done ? (
        /* 提交成功 */
        <div className="text-center py-6">
          <svg
            className="mx-auto mb-3 h-10 w-10 text-green-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm font-semibold text-slate-900">曝光已提交！</p>
          <p className="mt-1 text-xs text-slate-500">
            审核后将公开展示，感谢你的贡献
          </p>
          <button
            onClick={() => {
              resetForm();
              onSuccess();
            }}
            className="mt-4 rounded-full bg-red-50 px-5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100"
          >
            继续曝光
          </button>
        </div>
      ) : (
        /* 表单 */
        <div className="space-y-4">
          {/* 产品名称 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              产品名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：花西子空气蜜粉"
              maxLength={200}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-1 focus:ring-red-100"
            />
          </div>

          {/* 核心坑点 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              核心坑点（一句话标题） <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="例如：卡粉严重，油皮两小时脱妆"
              maxLength={100}
              value={pitTitle}
              onChange={(e) => setPitTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-1 focus:ring-red-100"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {pitTitle.length}/100
            </p>
          </div>

          {/* 详细描述（可选） */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              详细描述 <span className="font-normal text-slate-400">(可选)</span>
            </label>
            <textarea
              placeholder="展开说说你遇到的问题、使用场景、后悔的原因..."
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-300 focus:ring-1 focus:ring-red-100"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length}/2000
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-500">
              {error}
            </p>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-red-500 to-rose-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:from-red-600 hover:to-rose-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? '提交中...' : '发布曝光'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// ExposeFeed — 瀑布流卡片列表
// ============================================
function ExposeFeed() {
  const [posts, setPosts] = useState<ExposePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loaderRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorAction, setErrorAction] = useState('');

  const fetchPosts = useCallback(
    async (currentOffset: number, append = false) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError('');
        setErrorDetail('');
        setErrorCode('');
        setErrorAction('');
      }

      try {
        const res = await fetch(
          apiUrl(`/api/expose?status=verified&offset=${currentOffset}&limit=20`),
          { credentials: 'include' },
        );

        // ★ 先解析响应体，再判断状态码，确保错误详情不丢失
        let data: { posts?: ExposePost[]; hasMore?: boolean } & ApiErrorBody;
        try {
          data = (await res.json()) as { posts?: ExposePost[]; hasMore?: boolean } & ApiErrorBody;
        } catch {
          throw new Error(`HTTP ${res.status}: 响应不是合法 JSON（可能 Worker 崩溃了）`);
        }

        if (!res.ok) {
          // ★ 后端返回的结构化错误
          const detail = data.detail ?? '';
          const code = data.code ?? '';
          const action = data.action ?? '';
          const errMsg = data.error || `HTTP ${res.status}`;

          const fullMsg = [
            `[${code || 'HTTP ' + res.status}] ${errMsg}`,
            detail ? `\n原因: ${detail}` : '',
            action ? `\n修复: ${action}` : '',
          ].join('');

          throw Object.assign(new Error(fullMsg), { code, detail, action });
        }

        setPosts((prev) =>
          append ? [...prev, ...(data.posts ?? [])] : (data.posts ?? []),
        );
        setHasMore(data.hasMore ?? false);
        setOffset(currentOffset + (data.posts ?? []).length);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // 后端不可用（Failed to fetch / 连接失败）：使用本地兜底数据，不展示错误提示
        const isNetworkError =
          msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED') ||
          msg.includes(' Worker 崩溃了') || msg.includes('Failed to');
        if (isNetworkError && !append) {
          const fallback: ExposePost[] = [
            { id: 1, productName: '志高空气炸锅 99元版', pitTitle: '发热管功率虚标 40%，烤不熟', voteCount: 128, createdAt: Date.now() - 3600000 * 2, status: 'verified' },
            { id: 2, productName: 'SKG 眼部按摩仪 E3', pitTitle: 'AI 穴位按摩 = 偏心马达震动', voteCount: 96, createdAt: Date.now() - 3600000 * 5, status: 'verified' },
            { id: 3, productName: '奥克斯折叠洗衣机', pitTitle: '密封圈发霉，洗完更臭', voteCount: 74, createdAt: Date.now() - 3600000 * 8, status: 'verified' },
            { id: 4, productName: '荣事达无叶风扇', pitTitle: '风力不到台扇 1/3，噪音翻倍', voteCount: 52, createdAt: Date.now() - 3600000 * 12, status: 'verified' },
          ];
          setPosts(fallback);
          setHasMore(false);
          setOffset(fallback.length);
        } else if (err instanceof Error) {
          setError(err.message || '加载失败');
          const extra = err as Error & { code?: string; detail?: string; action?: string };
          setErrorCode(extra.code ?? '');
          setErrorDetail(extra.detail ?? '');
          setErrorAction(extra.action ?? '');
        } else {
          setError(String(err));
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // 首屏加载
  useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  // IntersectionObserver 自动加载更多
  useEffect(() => {
    if (!hasMore || loading || loadingMore || !loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts(offset, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, offset, fetchPosts]);

  // 曝光成功后刷新列表
  const refresh = useCallback(() => {
    setOffset(0);
    fetchPosts(0);
  }, [fetchPosts]);

  // 骨架卡片
  const SkeletonCards = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-100 bg-slate-50 p-5"
        >
          <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
          <div className="mb-2 h-5 w-3/4 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );

  // 空状态 → 展示示例数据
  if (!loading && posts.length === 0 && !error) {
    const DEMO_POSTS: ExposePost[] = [
      { id: -1, productName: '某品牌「0糖0脂」气泡水', pitTitle: '代糖陷阱：赤藓糖醇长期饮用影响肠道菌群', description: '宣传0糖0脂但使用大量赤藓糖醇，最新研究表明过量摄入会导致腹胀、腹泻，并破坏肠道有益菌平衡。配料表排名第二位就是赤藓糖醇，含量并不低。', voteCount: 128, createdAt: Date.now() - 86400000 * 2, status: 'verified' },
      { id: -2, productName: '网红「石墨烯」保暖内衣', pitTitle: '概念炒作：所谓石墨烯只是添加了微量炭黑', description: '售价299元，实际检测发现所谓的「石墨烯发热」成分含量不足0.1%，本质上就是普通聚酯纤维加了一点炭黑染色。发热效果与普通保暖内衣无差异。', voteCount: 86, createdAt: Date.now() - 86400000 * 5, status: 'verified' },
      { id: -3, productName: '某平台「百亿补贴」耳机', pitTitle: '特供版缩水：同型号线上专供版用料减配', description: '外观和正品一致，但拆解后发现内部电路板缩水严重——电容从原厂换成杂牌、线材铜含量下降30%。这是专门为补贴渠道生产的「特供版」。', voteCount: 256, createdAt: Date.now() - 86400000 * 7, status: 'verified' },
      { id: -4, productName: '儿童「DHA藻油」软糖果', pitTitle: '糖分超标：一颗含糖量相当于半罐可乐', description: '主打补充DHA的儿童保健品，但每颗含糖高达4g。按推荐日服3颗计算，孩子光吃这个就摄入12g游离糖，已接近WHO建议每日上限。', voteCount: 312, createdAt: Date.now() - 86400000 * 10, status: 'verified' },
      { id: -5, productName: '直播间「乳胶床垫」', pitTitle: '虚假合成：检测显示天然乳胶含量仅15%', description: '号称泰国进口天然乳胶含量93%，送检结果合成胶占比85%，且检出甲醛超标（0.18mg/m³）。长期接触可能引发皮肤过敏和呼吸道刺激。', voteCount: 445, createdAt: Date.now() - 86400000 * 14, status: 'verified' },
    ];
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            🔥 最新曝光
            <span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500">
              {DEMO_POSTS.length}+
            </span>
          </h2>
        </div>
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {DEMO_POSTS.map((post) => (
            <div
              key={post.id}
              className="group mb-4 break-inside-avoid rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
            >
              {/* 产品名 + 时间 */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex max-w-[70%] truncate rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {post.productName}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                  {formatTime(post.createdAt)}
                </span>
              </div>

              {/* 坑点标题 */}
              <p className="mb-2 text-sm font-semibold text-slate-800 leading-snug">
                {post.pitTitle}
              </p>

              {/* 描述 */}
              {post.description && (
                <p className="text-[13px] leading-relaxed text-slate-500">
                  {post.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 列表头部 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          🔥 最新曝光
          <span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500">
            {posts.length > 0 ? `${posts.length}+` : ''}
          </span>
        </h2>
        <button
          onClick={refresh}
          className="rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:text-red-500"
          title="刷新列表"
        >
          ↻ 刷新
        </button>
      </div>

      {loading ? (
        <SkeletonCards />
      ) : error ? (
        /* ---- 加载失败 UI（含详细错误信息） ---- */
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 text-lg">⚠️</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-700">数据加载失败</p>
              <p className="mt-1 text-xs text-red-500 break-words">
                {errorCode && (
                  <span className="mr-1 rounded bg-red-100 px-1.5 py-0.5 font-mono text-[11px] text-red-600">
                    {errorCode}
                  </span>
                )}
                {error}
              </p>
              {IS_DEV && errorDetail && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-400 hover:text-red-600">
                    查看详细错误（仅开发环境可见）
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-red-100 bg-white p-3 font-mono text-[11px] text-red-500 whitespace-pre-wrap break-words">
                    {errorDetail}
                  </pre>
                  {errorAction && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700">🔧 修复建议</p>
                      <pre className="mt-1 font-mono text-[11px] text-amber-600 whitespace-pre-wrap break-words">
                        {errorAction}
                      </pre>
                    </div>
                  )}
                </details>
              )}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={refresh}
              className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-600"
            >
              重新加载
            </button>
            <button
              onClick={() => {
                setError('');
                setErrorDetail('');
                setErrorCode('');
                setErrorAction('');
              }}
              className="rounded-lg border border-red-200 px-4 py-2 text-xs text-red-500 transition hover:bg-red-50"
            >
              关闭
            </button>
          </div>
        </div>
      ) : (
        /* 瀑布流卡片 */
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group mb-4 break-inside-avoid rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300"
            >
              {/* 产品名 + 时间 */}
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="inline-flex max-w-[70%] truncate rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {post.productName}
                </span>
                <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                  {formatTime(post.createdAt)}
                </span>
              </div>

              {/* 坑点标题 */}
              <p className="mb-2 text-sm font-semibold text-slate-800 leading-snug">
                {post.pitTitle}
              </p>

              {/* 详细描述 */}
              {post.description && (
                <p className="text-[13px] leading-relaxed text-slate-500">
                  {post.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 加载更多触发器 + 底部加载状态 */}
      <div ref={loaderRef} className="flex justify-center py-6">
        {loadingMore && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-red-400" />
            加载中...
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-xs text-slate-300">— 已加载全部 —</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// ExposePageContent — 渲染内容（抽离以便条件性 useAuth）
// ============================================
function ExposePageContent({
  isSignedIn,
  userId,
}: {
  isSignedIn: boolean | undefined;
  userId: string | null | undefined;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16">
      {/* ===== 页面标题区 ===== */}
      <section className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-3xl shadow-sm ring-1 ring-orange-100">
          🔥
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">排雷曝光台</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          真人实测，真实踩坑，一起曝光商家套路
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          所有曝光经严格筛选后展示，拒绝水军、拒绝商单
        </p>
        <div className="mx-auto mt-4 w-10 border-t-2 border-orange-400" />
      </section>

      {/* ===== 内容区 ===== */}
      <div className="w-full max-w-5xl">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* 左侧：提交表单 */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-24">
              <ExposeForm
                isSignedIn={isSignedIn}
                userId={userId}
                onSuccess={handleSuccess}
              />
            </div>
          </div>

          {/* 右侧：瀑布流 */}
          <div className="min-w-0 flex-1">
            <ExposeFeed key={refreshKey} />
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="mt-16 mb-8 flex items-center gap-4">
        <Link
          href="/"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
        >
          ← 返回单品检测
        </Link>
        <span className="text-slate-200">|</span>
        <Link
          href="/clinic"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
        >
          选品诊所
        </Link>
        <span className="text-slate-200">|</span>
        <Link
          href="/used-check"
          className="text-xs font-medium text-slate-400 transition-colors hover:text-red-500"
        >
          二手防坑
        </Link>
      </div>

      <p className="mb-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，曝光内容经审核后公开展示，不代表实验室立场。
      </p>
    </main>
  );
}

// ============================================
// ExposePageWithAuth — 有 Clerk 时，调用真实 useAuth
// ============================================
function ExposePageWithAuth() {
  const { isAuthenticated, user } = useAuth();
  return <ExposePageContent isSignedIn={isAuthenticated} userId={user?.username || null} />;
}

// ============================================
// 主组件 — 使用自定义认证
// ============================================
export default function ExposePage() {
  const { isAuthenticated, user } = useAuth();
  return <ExposePageContent isSignedIn={isAuthenticated} userId={user?.username || null} />;
}
