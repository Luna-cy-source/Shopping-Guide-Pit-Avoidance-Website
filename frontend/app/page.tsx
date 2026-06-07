'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useBookmarks, type BookmarkItem } from '../hooks/useBookmarks';
import { useAuth } from '../hooks/useAuth';
import { apiUrl } from '../lib/api';
import BroadcastTicker from '../components/BroadcastTicker';
import BookmarkDetailModal from '../components/BookmarkDetailModal';
import DataCredibility from '../components/DataCredibility';





const FALLBACK_QUERIES = [
  'iPhone 17 Pro Max',
  '戴森V16吸尘器',
  '花西子空气蜜粉',
  '戴尔XPS 15笔记本',
  'SK-II神仙水',
  '大疆Mini 4 Pro',
];

/* ============================================================
   模拟数据 — 用于新增创意模块
   ============================================================ */

/* ============================================================
   热门商品数据 — 带视觉主题配置
   ============================================================ */

const HOT_PRODUCTS = [
  { name: 'SK-II神仙水', category: '护肤', theme: 'rose', gradient: 'from-rose-50/80 via-pink-50/40 to-white', iconBg: 'bg-gradient-to-br from-rose-100 to-pink-200', iconText: 'text-rose-500', glow: 'hover:shadow-rose-100/50' },
  { name: '大疆Mini 4 Pro', category: '数码', theme: 'amber', gradient: 'from-amber-50/80 via-yellow-50/40 to-white', iconBg: 'bg-gradient-to-br from-amber-100 to-yellow-200', iconText: 'text-amber-500', glow: 'hover:shadow-amber-100/50' },
  { name: '戴尔XPS 15', category: '笔记本', theme: 'sky', gradient: 'from-sky-50/80 via-blue-50/40 to-white', iconBg: 'bg-gradient-to-br from-sky-100 to-blue-200', iconText: 'text-sky-500', glow: 'hover:shadow-sky-100/50' },
  { name: 'iPhone 17 Pro Max', category: '手机', theme: 'violet', gradient: 'from-violet-50/80 via-purple-50/40 to-white', iconBg: 'bg-gradient-to-br from-violet-100 to-purple-200', iconText: 'text-violet-500', glow: 'hover:shadow-violet-100/50' },
  { name: '戴森V16', category: '家电', theme: 'emerald', gradient: 'from-emerald-50/80 via-teal-50/40 to-white', iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-200', iconText: 'text-emerald-500', glow: 'hover:shadow-emerald-100/50' },
  { name: '花西子空气蜜粉', category: '美妆', theme: 'fuchsia', gradient: 'from-fuchsia-50/80 via-pink-50/40 to-white', iconBg: 'bg-gradient-to-br from-fuchsia-100 to-pink-200', iconText: 'text-fuchsia-500', glow: 'hover:shadow-fuchsia-100/50' },
];

/* 类别图标 SVG */
const CategoryIcon = ({ category, className }: { category: string; className?: string }) => {
  const icons: Record<string, JSX.Element> = {
    '护肤': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
      </svg>
    ),
    '数码': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    ),
    '笔记本': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
    '手机': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    ),
    '家电': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    '美妆': (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18.36 3.64a9 9 0 0 1 0 12.72l-5.66-5.66a2 2 0 0 0-2.83 0L4.22 16.36a9 9 0 0 1 0-12.72l5.66 5.66a2 2 0 0 0 2.83 0z"/>
      </svg>
    ),
  };
  return icons[category] || null;
};

const FALLBACK_REPORTS = [
  { product: 'SKG筋膜枪F7', risk: 'high' as const, score: 3.2, summary: '宣传"医疗级"实为普通按摩器，价格虚高300%', time: '2小时前', tags: ['虚假宣传', '价格虚高'] },
  { product: 'Ulike蓝宝石脱毛仪Air3', risk: 'medium' as const, score: 5.1, summary: '效果仅为心理安慰，长期或损伤牙釉质', time: '5小时前', tags: ['效果夸大', '安全隐患'] },
  { product: '石头扫地机G20', risk: 'low' as const, score: 7.8, summary: '建图准确但避障一般，性价比中等', time: '8小时前', tags: ['避障一般'] },
  { product: '九阳空气炸锅KL55-VF735', risk: 'medium' as const, score: 4.5, summary: '涂层易脱落，售后服务差，不推荐', time: '1天前', tags: ['质量问题', '售后差'] },
];

const QUICK_MODES = [
  { label: '单品检测', icon: '🔍', path: '/', color: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' },
  { label: '1v1对比', icon: '🥊', path: '/compare', color: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' },
  { label: '智商税排查', icon: '📉', path: '/blacklist', color: 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200' },
  { label: '二手验机', icon: '🛡️', path: '/used-check', color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' },
  { label: '个人主页', icon: '👤', path: '/profile', color: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200' },
];

/* ============================================================
   工具函数
   ============================================================ */

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* ============================================================
   子组件
   ============================================================ */

/** 数据统计徽章 — 升级版 */
function StatsBadge({ value, label, icon, color }: { value: string; label: string; icon: string; color: string }) {
  return (
    <div className="group flex flex-col items-center rounded-2xl bg-white/70 backdrop-blur-sm px-5 py-5 transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-0.5 border border-transparent hover:border-slate-100 min-w-[110px]">
      <span className={`text-3xl font-extrabold tracking-tight ${color}`}>{value}</span>
      <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        <span className="text-sm">{icon}</span>
        {label}
      </span>
    </div>
  );
}

/** 风险等级徽章 */
function RiskBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { text: '高风险', bg: 'bg-red-50', textColor: 'text-red-600', dot: 'bg-red-500', ring: 'ring-red-100' },
    medium: { text: '中风险', bg: 'bg-amber-50', textColor: 'text-amber-600', dot: 'bg-amber-500', ring: 'ring-amber-100' },
    low: { text: '低风险', bg: 'bg-emerald-50', textColor: 'text-emerald-600', dot: 'bg-emerald-500', ring: 'ring-emerald-100' },
  };
  const c = config[level];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${c.bg} px-2.5 py-1 text-[10px] font-bold ${c.textColor} ring-1 ${c.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.text}
    </span>
  );
}

/** 统一模块标题 */
function SectionHeader({ label, title, subtitle, light = false }: { label: string; title: string; subtitle?: string; light?: boolean }) {
  return (
    <div className="mb-10 text-center animate-fade-in-up">
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.3em] ${light ? 'text-slate-300' : 'text-slate-400'}`}>
        {label}
      </p>
      <h2 className={`text-xl font-bold sm:text-2xl ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
      {subtitle && <p className={`mt-2 text-sm ${light ? 'text-slate-300' : 'text-slate-400'}`}>{subtitle}</p>}
      <div className={`mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent ${light ? 'via-white/40' : 'via-red-400'} to-transparent`} />
    </div>
  );
}

/** 避坑分数条 */
function ScoreBar({ score }: { score: number }) {
  const width = `${score * 10}%`;
  const color = score >= 7 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width }} />
      </div>
      <span className={`text-[11px] font-bold ${score >= 7 ? 'text-emerald-600' : score >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score}</span>
    </div>
  );
}

/** 将 API 曝光数据映射为卡片格式 */
function mapExposePost(post: {
  id: number;
  product_name: string;
  pit_title: string;
  description: string | null;
  vote_count: number;
  created_at: number;
}) {
  const risk: 'high' | 'medium' | 'low' = post.vote_count >= 20 ? 'high' : post.vote_count >= 10 ? 'medium' : 'low';
  const score = risk === 'high' ? 3.2 : risk === 'medium' ? 5.1 : 7.5;
  return {
    id: post.id,
    product: post.product_name,
    risk,
    score,
    summary: post.pit_title + (post.description ? ` · ${post.description}` : ''),
    time: formatRelativeTime(post.created_at),
    tags: ['排雷曝光'],
  };
}

/* ============================================================
   主页面
   ============================================================ */

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setTrendingKeywords] = useState<string[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [viewingBookmark, setViewingBookmark] = useState<BookmarkItem | null>(null);
  const [exposeData, setExposeData] = useState<Array<{
    id: number;
    product_name: string;
    pit_title: string;
    description: string | null;
    vote_count: number;
    created_at: number;
  }> | null>(null);
  const [exposeLoading, setExposeLoading] = useState(true);

  const { mounted: histMounted, addHistory, history } = useSearchHistory(user?.uid);
  const { bookmarks, mounted: bmMounted, removeBookmark, clearBookmarks, hasBookmarks } = useBookmarks(user?.uid);
  const clientReady = histMounted && bmMounted;

  /* ---- 获取热搜 ---- */
  useEffect(() => {
    let cancelled = false;
    async function fetchTrending() {
      try {
        const resp = await fetch(apiUrl('/api/trending'));
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancelled && data.keywords?.length > 0) {
          setTrendingKeywords(data.keywords);
          return;
        }
      } catch (err) {
        console.warn('[热搜] API 获取失败，使用静态兜底:', err);
      }
      if (!cancelled) setTrendingKeywords(FALLBACK_QUERIES);
    }
    fetchTrending().finally(() => {
      if (!cancelled) setTrendingLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  /* ---- 获取最新曝光 ---- */
  useEffect(() => {
    let cancelled = false;
    async function fetchExpose() {
      try {
        const resp = await fetch(apiUrl('/api/expose?limit=4'));
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancelled && data.posts?.length > 0) {
          setExposeData(data.posts);
          return;
        }
      } catch (err) {
        console.warn('[曝光] API 获取失败，使用静态兜底:', err);
      }
      if (!cancelled) setExposeData([]);
    }
    fetchExpose().finally(() => {
      if (!cancelled) setExposeLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  /* ---- ESC 关闭收藏 ---- */
  useEffect(() => {
    if (!bookmarksOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBookmarksOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bookmarksOpen]);

  const handleSearch = (keyword: string) => {
    const q = keyword.trim();
    if (!q) return;
    addHistory(q);
    setIsLoading(true);
    router.push(`/report?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  return (
    <main className="flex flex-1 flex-col items-center">
      {/* ==================================================
          A 区：Hero + 搜索主场
          ================================================== */}
      <section className="relative flex w-full flex-col items-center overflow-hidden bg-slate-50 px-4 pt-16 pb-12 sm:pt-24 sm:pb-16">
        {/* 背景装饰 */}
        <div className="pointer-events-none absolute inset-0 bg-dots-sm" />
        <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-100/40 to-purple-100/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-gradient-to-br from-red-100/30 to-orange-100/20 blur-3xl" />

        {/* 收藏入口 */}
        {clientReady && hasBookmarks && (
          <button
            type="button"
            onClick={() => setBookmarksOpen(true)}
            className="fixed right-4 top-16 z-40 flex items-center gap-1.5 rounded-full border border-slate-100 bg-white/90 px-3.5 py-1.5 text-xs font-medium text-slate-500 shadow-sm backdrop-blur transition-all hover:border-amber-300 hover:text-amber-600 hover:shadow-md"
            title="我的收藏"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            我的收藏
            <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
              {bookmarks.length}
            </span>
          </button>
        )}

        {/* Logo / 品牌区 */}
        <div className="relative z-[1] mb-10 text-center animate-fade-in-up">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-slate-100">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            AI 避坑导购
          </h1>
          <p className="mt-3 text-sm font-medium uppercase tracking-[0.25em] text-slate-400">
            独立检测实验室
          </p>
          <div className="mx-auto mt-4 w-16 border-t-2 border-red-500" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            不从商家拿佣金，只对消费者负责<br />
            深度拆解隐形短板 · 营销陷阱 · 智商税
          </p>
        </div>

        {/* 搜索框 */}
        <form onSubmit={handleSubmit} className="relative z-[1] w-full max-w-xl animate-fade-in-up animate-fade-in-up-delay-1">
          <div className="card-input flex items-center gap-0">
            <span className="pl-5 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入商品名称，AI 帮你深度检测..."
              className="flex-1 bg-transparent px-3 py-4 text-base text-slate-900 placeholder:text-slate-400 outline-none"
              autoFocus
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="m-1.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:from-red-600 hover:to-rose-600 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
            >
              {isLoading ? '分析中...' : '检测'}
            </button>
          </div>
        </form>

        {/* 最近搜索（步骤8） */}
        {clientReady && history.length > 0 && (
          <div className="relative z-[1] mt-3 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up animate-fade-in-up-delay-2">
            <span className="text-[11px] text-slate-400">最近搜索：</span>
            {history.slice(0, 3).map((item, idx) => (
              <button
                key={`${item.query}-${idx}`}
                type="button"
                onClick={() => handleSearch(item.query)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-100 bg-white/60 px-3 py-1 text-[11px] text-slate-500 shadow-sm backdrop-blur transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:-translate-y-0.5"
                title={`${item.query} — ${formatRelativeTime(item.timestamp)}`}
              >
                <svg className="h-3 w-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {item.query}
              </button>
            ))}
          </div>
        )}

        {/* 快捷检测模式 */}
        <div className="relative z-[1] mt-4 flex flex-wrap items-center justify-center gap-2 animate-fade-in-up animate-fade-in-up-delay-2">
          <span className="text-[11px] text-slate-400 mr-1">快捷入口：</span>
          {QUICK_MODES.map((mode) => (
            <Link
              key={mode.label}
              href={mode.path}
              className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md ${mode.color}`}
            >
              <span>{mode.icon}</span>
              {mode.label}
            </Link>
          ))}
        </div>

        {/* 小探员广播 */}
        <div className="relative z-[1] mt-5 w-full max-w-xl">
          <BroadcastTicker />
        </div>

        {/* 数据统计徽章 */}
        <div className="relative z-[1] mt-10 flex items-center gap-4 sm:gap-6">
          <StatsBadge value="多品类" label="数码·美妆·家电" icon="🔍" color="text-gradient-red" />
          <StatsBadge value="多源验证" label="电商·口碑·实验室" icon="🎯" color="text-gradient-blue" />
          <StatsBadge value="即时生成" label="AI 深度检测报告" icon="⚡" color="text-slate-900" />
        </div>
      </section>

      {/* ==================================================
          C 区：热门检测 — 升级为迷你商品卡片
          ================================================== */}
      <section className="flex w-full flex-col items-center bg-white px-4 py-16">
        <SectionHeader label="实时热度" title="热门检测商品" subtitle="大家都在查什么，紧跟消费风向" />

        <div className="grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-fade-in-up">
          {trendingLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-slate-50" />
            ))
          ) : (
            HOT_PRODUCTS.map((product, idx) => (
              <button
                key={product.name}
                type="button"
                onClick={() => handleSearch(product.name)}
                className={`group flex flex-col items-center gap-2.5 rounded-2xl border border-slate-100/80 bg-gradient-to-b ${product.gradient} p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${product.glow}`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* 图标容器 */}
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${product.iconBg} transition-transform duration-300 group-hover:scale-105`}>
                  <CategoryIcon category={product.category} className={`w-5 h-5 ${product.iconText}`} />
                </div>

                {/* 商品名 */}
                <span className="text-[12px] font-semibold text-slate-700 truncate w-full text-center leading-tight">
                  {product.name}
                </span>

                {/* 分类标签 */}
                <span className="inline-flex items-center rounded-lg bg-white/90 px-2 py-0.5 text-[9.5px] font-medium text-slate-400 shadow-xs border border-slate-50">
                  {product.category}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* ==================================================
          D 区：最新避坑情报（新增创意模块）
          ================================================== */}
      <section className="flex w-full flex-col items-center bg-slate-50 px-4 py-16">
        <SectionHeader label="情报中心" title="最新避坑情报" subtitle="24小时实时监测，第一时间曝光新套路" />

        <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-in-up">
          {exposeLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
            ))
          ) : (
            (exposeData && exposeData.length > 0 ? exposeData.map(mapExposePost) : FALLBACK_REPORTS).map((report, idx) => (
              <div
                key={`${report.product}-${idx}`}
                className="group card-premium-interactive flex flex-col gap-3 p-5"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{report.product}</h3>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{report.summary}</p>
                  </div>
                  <RiskBadge level={report.risk} />
                </div>

                <ScoreBar score={report.score} />

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {report.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-300 shrink-0">{report.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ==================================================
          F 区：功能模块入口
          ================================================== */}
      <section className="flex w-full flex-col items-center bg-slate-50 px-4 py-16 sm:py-20">
        <SectionHeader label="全部功能" title="六大检测模块，全方位避坑" subtitle="从单品分析到二手鉴定，覆盖消费决策全链路" />

        <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3 animate-fade-in-up">
          <Link href="/" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-red-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              🔍
            </div>
            <h3 className="text-sm font-bold text-slate-900">单品检测</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              输入商品名，获取深度避坑报告
            </p>
          </Link>

          <Link href="/compare" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-amber-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              🥊
            </div>
            <h3 className="text-sm font-bold text-slate-900">1v1 对比</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              多维度擂台，帮你在两款中做出选择
            </p>
          </Link>

          <Link href="/blacklist" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-red-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              📉
            </div>
            <h3 className="text-sm font-bold text-slate-900">智商税黑榜</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              月度热榜，避开全网公认智商税产品
            </p>
          </Link>

          <Link href="/clinic" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-purple-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              💡
            </div>
            <h3 className="text-sm font-bold text-slate-900">选品诊所</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              描述需求，AI反向推荐最匹配的商品
            </p>
          </Link>

          <Link href="/used-check" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-blue-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              🛡️
            </div>
            <h3 className="text-sm font-bold text-slate-900">二手防坑</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              骗局话术拆解 + 保姆级验机清单
            </p>
          </Link>

          <Link href="/expose" className="card-premium-interactive shimmer group flex flex-col items-center p-6 hover:border-orange-200">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110">
              🔥
            </div>
            <h3 className="text-sm font-bold text-slate-900">排雷曝光</h3>
            <p className="mt-1.5 text-center text-[11px] leading-relaxed text-slate-400">
              真人实测，一起曝光商家套路
            </p>
          </Link>
        </div>
      </section>

      {/* ==================================================
          J 区：信任标识
          ================================================== */}
      <section className="flex w-full flex-col items-center bg-slate-50 px-4 py-14">
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-medium text-slate-300">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            AI 驱动 · 数据溯源
          </span>
          <span className="hidden sm:inline text-slate-200">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            不恰饭 · 不收佣金
          </span>
          <span className="hidden sm:inline text-slate-200">·</span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            持续更新 · 实时追踪
          </span>
        </div>
      </section>

      {/* ==================================================
          K 区：可视化数据背书 — GitHub 公开数据集统计
          ================================================== */}
      <DataCredibility />

      {/* 底部声明 */}
      <p className="w-full bg-white py-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，不收取任何商家佣金，分析结果仅供参考。
      </p>

      {/* ==================================================
          收藏列表侧边栏 / Drawer
          ================================================== */}
      {bookmarksOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setBookmarksOpen(false)} />
          <aside className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-sm bg-white shadow-2xl transition-transform">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                  <h2 className="text-base font-bold text-slate-900">我的收藏</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    {bookmarks.length}
                  </span>
                </div>
                <button onClick={() => setBookmarksOpen(false)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {hasBookmarks ? (
                  <div className="space-y-2">
                    {bookmarks.map((bm) => (
                      <div key={bm.url} className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-white hover:shadow-sm">
                        {/* 优先展示缓存数据，无缓存则跳转 */}
                        {bm.reportData ? (
                          <button
                            type="button"
                            onClick={() => { setBookmarksOpen(false); setViewingBookmark(bm); }}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.25 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{bm.productName}</p>
                              <p className="text-[11px] text-emerald-500">✅ 已保存完整报告</p>
                            </div>
                          </button>
                        ) : bm.type === 'clinic' ? (
                          <button
                            type="button"
                            onClick={() => {
                              const q = bm.productName.replace(/^选品推荐:\s*/, '');
                              setBookmarksOpen(false);
                              router.push(`/clinic?q=${encodeURIComponent(q)}`);
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{bm.productName}</p>
                              <p className="text-[11px] text-purple-500">→ 查看避坑报告</p>
                            </div>
                          </button>
                        ) : (
                          <Link href={bm.url} onClick={() => setBookmarksOpen(false)} className="flex min-w-0 flex-1 items-center gap-3">
                            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                            </svg>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{bm.productName}</p>
                              <p className="text-[11px] text-slate-400">{formatRelativeTime(bm.savedAt)}</p>
                            </div>
                          </Link>
                        )}
                        <button type="button" onClick={() => removeBookmark(bm.url)} className="ml-2 shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100" title="取消收藏">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <svg className="mb-3 h-12 w-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-400">暂无收藏</p>
                    <p className="mt-1 text-xs text-slate-300">在报告中点击 ⭐ 即可收藏</p>
                  </div>
                )}
              </div>
              {hasBookmarks && (
                <div className="border-t border-slate-100 px-6 py-3">
                  <button type="button" onClick={() => { clearBookmarks(); setBookmarksOpen(false); }} className="w-full rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500">
                    清空全部收藏
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* 收藏详情弹窗 */}
      {viewingBookmark && (
        <BookmarkDetailModal
          bookmark={viewingBookmark}
          onClose={() => setViewingBookmark(null)}
          onNavigate={(url) => { setViewingBookmark(null); router.push(url); }}
        />
      )}
    </main>
  );
}
