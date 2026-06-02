'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { submitSearch, pollResult, isResponseComplete, apiUrl } from '../lib/api';
import PriceReferenceCard from './PriceReferenceCard';
import SourceStatsPanel from './SourceStatsPanel';
import SpecsCheckTable from './SpecsCheckTable';
import VerifySearch from './VerifySearch';
import CommerceBanner from './CommerceBanner';
import MarkdownRenderer from './MarkdownRenderer';
import html2canvas from 'html2canvas';
import { ProductStructuredData } from './ProductStructuredData';

// ============================================
// Props
// ============================================
interface ReportStreamerProps {
  query: string;
}

// ============================================
// 图表骨架屏（尺寸匹配最终图表，避免 CLS 布局抖动）
// ============================================

/** RiskGauge 骨架屏 — 320×320 viewBox，max-w-[300px]，中心显示面板 */
function RiskGaugeSkeleton() {
  return (
    <div className="flex flex-col items-center select-none">
      <svg
        viewBox="0 0 320 320"
        width={300}
        height={300}
        role="img"
        aria-label="仪表盘加载中"
      >
        {/* 外圈 */}
        <circle cx="160" cy="185" r="134" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        {/* 表盘底板 */}
        <circle cx="160" cy="185" r="124" fill="#f9fafb" />
        {/* 半圆轨道凹槽 */}
        <path
          d={(() => {
            const arcR = 105;
            const toRad = (deg: number) => (deg / 180) * Math.PI;
            const pos = (r: number, rad: number) => ({
              x: (160 + r * Math.cos(rad)).toFixed(2),
              y: (185 - r * Math.sin(rad)).toFixed(2),
            });
            const s = pos(arcR, toRad(180));
            const e = pos(arcR, toRad(0));
            return `M ${s.x} ${s.y} A ${arcR} ${arcR} 0 0 1 ${e.x} ${e.y}`;
          })()}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="24"
          strokeLinecap="butt"
        />
        {/* 中心显示面板 */}
        <rect x="110" y="211" width="100" height="62" rx="16" fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="0.8" />
        <text
          x="146" y="236"
          textAnchor="end" dominantBaseline="central"
          fill="#d1d5db" fontSize="30" fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
        >
          --.-
        </text>
        <text
          x="152" y="227"
          textAnchor="start" dominantBaseline="central"
          fill="#d1d5db" fontSize="12" fontWeight="600"
        >
          /10
        </text>
        <text
          x="160" y="257"
          textAnchor="middle" dominantBaseline="central"
          fill="#d1d5db" fontSize="12" fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite" />
          加 载 中 ...
        </text>
      </svg>
      <div className="mt-2 h-5 w-14 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

/** PriceChart 骨架屏 — 280px 高，模拟 12 个月柱状图 */
function PriceChartSkeleton() {
  const heights = [42, 58, 66, 52, 73, 70, 87, 60, 64, 46, 77, 51];
  return (
    <div className="relative h-[280px]" role="status" aria-label="价格走势图加载中">
      {/* Y 轴标签骨架 */}
      <div className="absolute left-0 top-4 flex h-[240px] flex-col justify-between pb-5 pl-1">
        <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-8 animate-pulse rounded bg-gray-200" />
      </div>
      {/* 柱状图区域 */}
      <div className="ml-10 flex h-full items-end gap-1.5 px-1 pt-8 pb-8">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-sm bg-gray-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      {/* X 轴标签骨架 */}
      <div className="absolute bottom-2 left-10 right-2 flex gap-1.5 px-1">
        {heights.map((_, i) => (
          <div key={i} className="flex-1 h-2 animate-pulse rounded bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

/** SharePoster 骨架屏 — 匹配"生成分享海报"按钮尺寸 */
function SharePosterSkeleton() {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border-2 border-gray-100 bg-gray-50 px-6 py-3">
      <span className="h-4 w-4 animate-pulse rounded bg-gray-200" />
      <span className="h-4 w-28 animate-pulse rounded bg-gray-200" />
    </span>
  );
}

/** FlawRadar 骨架屏 — 匹配雷达图尺寸 */
function FlawRadarSkeleton() {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

// ============================================
// 争议点标注组件（步骤1：报告页新增争议点板块）
// ============================================
type DisputeType = 'unconfirmed' | 'unanswered' | 'confirmed';

interface DisputeItem {
  title: string;
  analysis: string;
}

// 从槽点列表中智能推断争议类型
function inferDisputeType(analysis: string): DisputeType {
  const lower = analysis.toLowerCase();
  if (lower.includes('已证实') || lower.includes('确认') || lower.includes('实锤') || lower.includes('实测')) return 'confirmed';
  if (lower.includes('存疑') || lower.includes('争议') || lower.includes('实验') || lower.includes('检测') || lower.includes('疑问')) return 'unconfirmed';
  return 'unanswered';
}

const DISPUTE_CONFIG: Record<DisputeType, { label: string; bg: string; text: string; icon: string; desc: string }> = {
  unconfirmed: { label: '实验室存疑', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🔬', desc: '该问题尚未通过独立实验室复现验证，仅供参考' },
  unanswered: { label: '官方未回应', bg: 'bg-slate-100', text: 'text-slate-600', icon: '📋', desc: '已向品牌方发出质询，目前尚未收到官方回复' },
  confirmed: { label: '已证实问题', bg: 'bg-red-50', text: 'text-red-700', icon: '⚠️', desc: '该问题已通过独立实验室实测证实，建议重点关注' },
};

function DisputeLabels({ flaws }: { flaws: Array<{ title?: string; analysis?: string }> }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (!flaws || flaws.length === 0) return null;

  const disputeItems: (DisputeItem & { type: DisputeType })[] = flaws.map((f) => ({
    title: f.title ?? '未知问题',
    analysis: f.analysis ?? '',
    type: inferDisputeType(f.analysis ?? ''),
  }));

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-5 mt-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        争议点标注
        <span className="rounded-full bg-gray-100 px-1.5 py-0 text-[10px] font-normal text-gray-500">{disputeItems.length}</span>
      </h3>
      <div className="space-y-2">
        {disputeItems.map((item, idx) => {
          const cfg = DISPUTE_CONFIG[item.type];
          const isExpanded = expandedIdx === idx;
          return (
            <div key={idx} className="rounded-lg border border-gray-100 bg-gray-50/50 overflow-hidden">
              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <span className="flex-1 text-xs font-medium text-gray-700 truncate">{item.title}</span>
                <button
                  type="button"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className={`shrink-0 text-xs font-medium transition-colors ${isExpanded ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                >
                  {isExpanded ? '收起' : '详情'}
                </button>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 bg-white px-3.5 py-3">
                  <p className="text-xs leading-relaxed text-gray-600">{item.analysis}</p>
                  <p className="mt-2 text-[10px] text-gray-400">{cfg.desc}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ============================================
// next/dynamic 懒加载：ECharts / html2canvas 按需下载
//    ssr: false   → 跳过服务端渲染（图表依赖浏览器 API）
//    loading:     → 骨架屏占位，消除 CLS 布局抖动
//    Suspense     → 流式数据到达时异步 startTransition 加载图表模块
// ============================================
const RiskGauge = dynamic(
  () =>
    import('./charts/RiskGauge').then((m) => ({ default: m.RiskGauge })),
  { ssr: false, loading: () => <RiskGaugeSkeleton /> }
);

const PriceChart = dynamic(
  () =>
    import('./charts/PriceChart').then((m) => ({ default: m.PriceChart })),
  { ssr: false, loading: () => <PriceChartSkeleton /> }
);

const FlawRadar = dynamic(
  () =>
    import('./charts/FlawRadar').then((m) => ({ default: m.FlawRadar })),
  { ssr: false, loading: () => <FlawRadarSkeleton /> }
);

const SharePoster = dynamic(() => import('./SharePoster'), {
  ssr: false,
  loading: () => <SharePosterSkeleton />,
});

// ============================================
// 辅助：根据评分返回色阶
// ============================================
function scoreColor(score: number): {
  ring: string;
  text: string;
  label: string;
} {
  if (score < 4) {
    return { ring: '#ef4444', text: '#dc2626', label: '慎入' };
  }
  if (score < 7) {
    return { ring: '#f59e0b', text: '#d97706', label: '谨慎' };
  }
  return { ring: '#10b981', text: '#059669', label: '推荐' };
}

// ============================================
// 子组件：全局骨架屏
// ============================================
function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-6">
      {/* 评分骨架 */}
      <div className="flex items-center gap-6 rounded-xl border border-gray-100 bg-gray-50 p-6">
        <div className="h-24 w-24 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-4 w-48 rounded bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-200" />
        </div>
      </div>

      {/* 价格分析骨架 */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
        <div className="mb-3 h-5 w-24 rounded bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>
      </div>

      {/* 坑点卡片骨架 */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-100 bg-gray-50 p-6"
        >
          <div className="mb-3 h-5 w-40 rounded bg-gray-200" />
          <div className="mb-4 rounded-md border-l-2 border-gray-200 bg-gray-100 px-4 py-2">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 子组件：错误展示
// ============================================
function ErrorDisplay({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  const isDev = process.env.NODE_ENV === 'development';
  const msg = error.message || '未知错误';
  const statusMatch = msg.match(/(\d{3})/);
  const statusCode = statusMatch ? statusMatch[1] : null;
  let hint = '';
  if (statusCode === '404') {
    hint = 'API 地址未找到，请检查 Worker URL 配置';
  } else if (statusCode === '500' || statusCode === '502' || statusCode === '504') {
    hint = 'AI 服务暂时不可用，请稍后重试';
  } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
    hint = '网络连接失败，请检查网络或 Worker 是否正常运行';
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="font-semibold text-red-700">分析失败</p>
      <p className="mt-1 text-sm text-red-500">{hint || msg}</p>
      {isDev && (
        <p className="mt-1 text-xs text-red-400 font-mono break-all">{msg}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-red-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600"
      >
        重新检测
      </button>
    </div>
  );
}

// ============================================
// 子组件：流中断 — 已有部分数据时的优雅降级横幅
// ============================================
function StreamErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg
              className="h-4 w-4 text-amber-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              网络开小差了，当前已分析部分内容。
            </p>
            <p className="mt-0.5 text-xs text-amber-600">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-[0.98]"
        >
          重新分析
        </button>
      </div>
    </div>
  );
}

// ============================================
// 子组件：长耗时提示 — 流式传输超过阈值时的提示横幅
// ============================================
function SlowGenerationBanner() {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
        <p className="text-xs text-blue-600">
          AI 正在深度分析中，复杂商品可能需要更长时间...
        </p>
      </div>
    </div>
  );
}

// ============================================
// 子组件：评分占位（数据未到）
// ============================================
function ScorePlaceholder() {
  return (
    <div className="flex items-center gap-6">
      <div className="relative flex h-[130px] w-[130px] shrink-0 items-center justify-center">
        <svg width="130" height="130" className="-rotate-90">
          <circle
            cx="65"
            cy="65"
            r="52"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="8"
          />
        </svg>
        <span className="absolute">
          <svg
            className="h-8 w-8 animate-spin text-gray-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </span>
      </div>
      <div>
        <p className="text-sm text-gray-400">评分加载中...</p>
      </div>
    </div>
  );
}

// ============================================
// 本地离线报告生成器：AI 服务不可用时自动降级
// ============================================
/**
 * 本地离线报告生成器（AI 不可用时的备用方案）
 * 不再编造虚假价格和数据，诚实告知用户数据暂不可用
 */
function generateLocalReport(query: string) {
  const name = query.trim();

  return {
    intent: 'product' as const,
    productName: name,
    score: 0, // 0 表示无评分
    priceAnalysis: `⚠️ AI 分析服务暂时不可用，无法获取「${name}」的价格分析。请稍后重试，或直接访问京东/淘宝搜索该商品查看实时价格。`,
    imageUrl: '',
    productImage: { url: 'null', alt: name },
    sourceStats: { sampleSize: 0, platforms: [], note: 'AI服务不可用，暂无数据来源' },
    skus: [],
    visData: {
      flawRadar: {
        '数据暂缺': 0,
      },
    },
    flaws: [
      { title: '数据暂不可用', quote: 'AI 分析服务当前未能返回结果', analysis: '请检查网络连接后刷新页面重试。如果问题持续，可能是 API 服务暂时波动，稍等几分钟再试。' },
    ],
    alternatives: [],
    specsCheck: [],
    priceReference: [],
  };
}

// ============================================
// 主组件：ReportStreamer
// ============================================
export function ReportStreamer({ query }: ReportStreamerProps) {
  // ===== 自定义 fetch 状态（替代 experimental_useObject）=====
  const [aiObject, setAiObject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [realPriceItems, setRealPriceItems] = useState<any[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // ===== 获取慢慢买实时价格（AI 数据就绪后触发）=====
  useEffect(() => {
    if (!aiObject?.productName) return;
    let cancelled = false;
    
    async function fetchRealPrice() {
      try {
        const res = await fetch(`${apiUrl}/api/price?keyword=${encodeURIComponent(aiObject.productName)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.items?.length > 0 && !cancelled) {
          console.log(`[实时价格] ✅ ${data.items.length}个平台 | 来源=${data.source}`);
          setRealPriceItems(data.items);
        }
      } catch (err) {
        if (!cancelled) console.warn(`[实时价格] ⚠️ 获取失败:`, err);
      }
    }
    
    fetchRealPrice();
    return () => { cancelled = true; };
  }, [aiObject?.productName]);

  /**
   * 核心请求函数 — 异步 Job + 轮询模式
   *
   * 流程：
   *   1. POST /api/search → 立即返回 { jobId, status }
   *   2. 如果 status='done'（缓存命中）→ 直接展示
   *   3. 如果 status='processing' → 轮询 GET /api/search/result
   *      - 阶段A（快速轮询）：前 15 次，每 1.5s 一次（覆盖大多数 5-20s 内完成的任务）
   *      - 阶段B（慢速轮询）：后 25 次，每 3s 一次（覆盖 DeepSeek 超时+兜底的 20-50s 长任务）
   *      - 总上限 ~90s，之后进入长轮询模式（每 5s 一次，最多再查 20 次 = 再等 100s）
   *   4. 全部超时 → 显示部分结果 / 错误提示
   *
   * 优势：彻底避免长连接超时截断问题，Worker 后台异步处理无时间限制
   */
  const submit = useCallback(async (input: { query: string }) => {
    if (abortRef.current) abortRef.current.abort();

    setIsLoading(true);
    setError(null);
    setAiObject(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const t0 = Date.now();

    // ★ 阶段A：快速轮询（覆盖大部分缓存/快速响应场景）
    const FAST_POLLS = 15;
    const FAST_INTERVAL = 1500; // 1.5s
    // ★ 阶段B：慢速轮询（覆盖 DeepSeek 超时 + 兜底的长任务）
    const SLOW_POLLS = 25;
    const SLOW_INTERVAL = 3000; // 3s
    // ★ 阶段C：长轮询（极端情况，给后台更多时间）
    const LONG_POLL_INTERVAL = 5000; // 5s
    const LONG_POLLS = 20;
    let jobId = ''; // 在外层声明，catch 中可引用

    try {
      // 步骤 1：提交搜索（POST 立即返回）
      console.log(`[ReportStreamer] 🚀 提交搜索 | query="${input.query}"`);
      const job = await submitSearch(input.query);
      jobId = job.jobId;
      console.log(`[ReportStreamer] 📋 Job 创建 | jobId=${jobId.slice(0, 8)}... | status=${job.status} | 耗时=${Date.now() - t0}ms`);

      if (controller.signal.aborted) return;

      // 步骤 2：缓存命中 → 直接返回
      if (job.status === 'done' && job.data) {
        console.log(`[ReportStreamer] ⚡ 缓存命中！总耗时=${Date.now() - t0}ms`);
        if (!isResponseComplete(job.data)) {
          throw new Error('INCOMPLETE: 缓存数据关键字段缺失');
        }
        setAiObject(job.data);
        return;
      }

      if (job.status === 'error') {
        // DeepSeek 错误：直接触发 fallback，不进入轮询
        throw new Error(job.error || 'AI 分析失败');
      }

      // 步骤 3：阶段A — 快速轮询（首次立即查询，不等待）
      console.log(`[ReportStreamer] ⏳ [阶段A] 快速轮询开始（间隔=${FAST_INTERVAL / 1000}s，最多${FAST_POLLS}次）...`);

      for (let i = 0; i < FAST_POLLS; i++) {
        if (controller.signal.aborted) return;
        // 首次不等待，后续每次间隔 FAST_INTERVAL
        if (i > 0) await new Promise(r => setTimeout(r, FAST_INTERVAL));

        const result = await pollResult(jobId);
        console.log(`[ReportStreamer] 🔍 [阶段A] #${i + 1} | status=${result.status} | 总耗时=${Date.now() - t0}ms`);

        if (result.status === 'done' && result.data) {
          console.log(`[ReportStreamer] ✅ 数据就绪！productName=${result.data.productName} | flaws=${result.data.flaws?.length || 0}条 | 总耗时=${Date.now() - t0}ms`);
          if (!isResponseComplete(result.data)) {
            throw new Error('INCOMPLETE: AI 返回数据关键字段缺失');
          }
          setAiObject(result.data);
          return;
        }

        if (result.status === 'error' || result.status === 'not_found') {
          throw new Error(result.error || result.hint || 'AI 分析失败');
        }
      }

      // 步骤 4：阶段B — 慢速轮询（DeepSeek 可能超时触发 Workers AI 兜底）
      console.log(`[ReportStreamer] ⏳ [阶段B] 慢速轮询（间隔=${SLOW_INTERVAL / 1000}s，最多${SLOW_POLLS}次）...`);

      for (let i = 0; i < SLOW_POLLS; i++) {
        if (controller.signal.aborted) return;
        await new Promise(r => setTimeout(r, SLOW_INTERVAL));

        const result = await pollResult(jobId);
        console.log(`[ReportStreamer] 🔍 [阶段B] #${i + 1} | status=${result.status} | 总耗时=${Date.now() - t0}ms`);

        if (result.status === 'done' && result.data) {
          console.log(`[ReportStreamer] ✅ 数据就绪！productName=${result.data.productName} | 总耗时=${Date.now() - t0}ms`);
          if (!isResponseComplete(result.data)) {
            throw new Error('INCOMPLETE: AI 返回数据关键字段缺失');
          }
          setAiObject(result.data);
          return;
        }

        if (result.status === 'error' || result.status === 'not_found') {
          throw new Error(result.error || result.hint || 'AI 分析失败');
        }
      }

      // 步骤 5：阶段C — 长轮询（极端情况，继续等待但不阻塞 UI）
      console.log(`[ReportStreamer] ⏳ [阶段C] 长轮询模式（间隔=${LONG_POLL_INTERVAL / 1000}s，最多${LONG_POLLS}次）...`);

      for (let i = 0; i < LONG_POLLS; i++) {
        if (controller.signal.aborted) return;
        await new Promise(r => setTimeout(r, LONG_POLL_INTERVAL));

        const result = await pollResult(jobId);
        console.log(`[ReportStreamer] 🔍 [阶段C] #${i + 1} | status=${result.status} | 总耗时=${Date.now() - t0}ms`);

        if (result.status === 'done' && result.data) {
          console.log(`[ReportStreamer] ✅ 数据就绪！总耗时=${Date.now() - t0}ms`);
          if (!isResponseComplete(result.data)) {
            throw new Error('INCOMPLETE: AI 返回数据关键字段缺失');
          }
          setAiObject(result.data);
          return;
        }

        if (result.status === 'error' || result.status === 'not_found') {
          throw new Error(result.error || result.hint || 'AI 分析失败');
        }
      }

      // 全部轮询耗尽
      throw new Error(`TIMEOUT: 轮询 ${((FAST_POLLS * FAST_INTERVAL) + (SLOW_POLLS * SLOW_INTERVAL) + (LONG_POLLS * LONG_POLL_INTERVAL)) / 1000}s 后仍未完成`);

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[ReportStreamer] 用户取消请求');
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ReportStreamer] ❌ 失败 | 耗时=${Date.now() - t0}ms | ${errMsg}`);

      // ★ 增强重试：仅对网络类错误静默重试（DeepSeek 错误不重试，直接本地兜底）
      const isNetworkRetry = errMsg.includes('processing') || errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed') || errMsg.includes('not_found');
      if (isNetworkRetry) {
        console.log('[ReportStreamer] 🔄 进入静默重试模式（每 5s × 10 次）...');
        for (let retry = 0; retry < 10; retry++) {
          if (controller.signal.aborted) return;
          await new Promise(r => setTimeout(r, 5000));
          try {
            const result = await pollResult(jobId || '');
            if (result.status === 'done' && result.data) {
              console.log(`[ReportStreamer] ✅ 重试成功！第 ${retry + 1} 次重试命中 | 总耗时=${Date.now() - t0}ms`);
              setAiObject(result.data);
              return;
            }
            console.log(`[ReportStreamer] 🔄 重试 #${retry + 1} | status=${result.status}`);
          } catch {}
        }
        console.warn('[ReportStreamer] ⚠️ 静默重试全部耗尽');
      }

      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [query]);

  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  // 本地离线兜底报告（在 submit 之后声明，但运行时已初始化）
  const [localReport, setLocalReport] = useState<any>(null);

  // 错误时自动降级到本地兜底
  useEffect(() => {
    if (!error) return;
    const msg = error?.message || '';
    const isServerOrNetworkError =
      msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED') ||
      msg.includes('500') || msg.includes('Internal') || msg.includes('Server') ||
      msg.includes('timeout') || msg.includes('TIMEOUT') || msg.includes('Abort') ||
      msg.includes('Failed') || msg.includes('Not Found') || msg.includes('404') ||
      msg.includes('DEEPSEEK') || msg.includes('Job 创建失败') || msg.includes('数据不完整');
    if (isServerOrNetworkError && !localReport) {
      console.log('[ReportStreamer] 触发本地兜底报告');
      setLocalReport(generateLocalReport(query));
    }
  }, [error, query]); // 移除 localReport 依赖，避免无限重渲染

  // 合并：优先本地兜底，其次 AI 返回
  const object = localReport || aiObject;

  // 反馈投票状态：key 为 flaw index，value 为 -1 / 0 / 1
  const [votes, setVotes] = useState<Record<number, number>>({});
  // 提交中状态
  const [submittingIndex, setSubmittingIndex] = useState<number | null>(null);

  // 图片加载失败降级标志 — 已由 ProductImage 组件内部处理
  // SKU 型号选择器：当前选中的 SKU index
  const [selectedSkuIndex, setSelectedSkuIndex] = useState(0);

  // 登录门禁（步骤9）：自定义认证
  const { isAuthenticated } = useAuth();

  // ===== 流中断优雅降级：追踪是否已收到部分数据 =====
  const hasPartialContentRef = useRef(false);
  // 每当我们 detect 到 object 已经有了 intent，标记为"已有部分数据"
  if (object?.intent && !hasPartialContentRef.current) {
    hasPartialContentRef.current = true;
  }
  // 当查询词变化时重置
  useEffect(() => {
    hasPartialContentRef.current = false;
    setSelectedSkuIndex(0);
    setLocalReport(null);
  }, [query]);

  // ===== 长耗时兜底检测：超过 30 秒未收到 intent 则提示 =====
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    setIsSlow(false);
    if (!isLoading) return;
    const timer = setTimeout(() => {
      if (!object?.intent) {
        setIsSlow(true);
      }
    }, 30_000);
    return () => clearTimeout(timer);
  }, [isLoading, object?.intent, query]);

  useEffect(() => {
    submit({ query });
    setIsSlow(false);
    setLocalReport(null);
  }, [query]);

  // 反馈提交回调
  const handleFeedback = useCallback(
    async (flawTitle: string, index: number, vote: -1 | 1) => {
      // 切换：同票取消，异票切换
      setVotes((prev) => {
        const current = prev[index];
        if (current === vote) {
          return { ...prev, [index]: 0 };
        }
        return { ...prev, [index]: vote };
      });

      setSubmittingIndex(index);
      try {
        await fetch(apiUrl('/api/feedback'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            flaw_title: flawTitle,
            vote,
          }),
        });
      } catch (err) {
        console.error('[反馈] 提交失败:', err);
      } finally {
        setSubmittingIndex(null);
      }
    },
    [query]
  );

  // 导出报告处理函数（必须放在组件顶层，不能在条件分支内）
  const handleExportReport = useCallback(async () => {
    if (!reportContainerRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportContainerRef.current, {
        backgroundColor: '#f8fafc',
        scale: 2,
        useCORS: true,
        logging: false,
        width: reportContainerRef.current.scrollWidth,
        windowWidth: reportContainerRef.current.scrollWidth,
      });
      const link = document.createElement('a');
      link.download = `避坑报告_${object?.productName || query}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('[导出] 失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }, [object?.productName, query]);

  // ===== 1. 全局加载：无 intent =====
  if (isLoading && !object?.intent) {
    return (
      <div className="space-y-4">
        <SkeletonLoader />
        {isSlow && <SlowGenerationBanner />}
      </div>
    );
  }

  // ===== 1.5 超长等待 + 无数据（非 error，但 isLoading 为 false 或长时间无响应）=====
  if (!isLoading && !object?.intent && !error) {
    return (
      <div className="space-y-4">
        <SkeletonLoader />
        <StreamErrorBanner
          message="AI 分析耗时较长，商品可能较复杂。可点击重试或稍后再试。"
          onRetry={() => {
            hasPartialContentRef.current = false;
            submit({ query });
          }}
        />
      </div>
    );
  }

  // ===== 2. 错误状态：无任何部分数据 → 全屏错误 =====
  if (error && !object?.intent) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => {
          hasPartialContentRef.current = false;
          submit({ query });
        }}
      />
    );
  }

  // ===== 2.5 流中断但已有部分数据 → 稍后在报告中插入警告横幅 =====
  // 注意：本地兜底模式下不显示流中断横幅（避免和离线提示重复）
  const showStreamError = !!(error && hasPartialContentRef.current && !localReport);
  const streamErrorMessage =
    error?.message || '数据流中断，当前展示的是已分析到的部分内容。';

  // ===== 3. 商品分析模式 =====
  if (object?.intent === 'product') {
    const flaws = object.flaws || [];
    const alternatives = object.alternatives || [];
    const hasScore = typeof object.score === 'number';
    // 图片源：优先取已代理的 productImage.url，兼容原始直链 imageUrl
    const rawImageUrl = (object.imageUrl as string)?.trim() || '';
    const proxiedUrl = (object.productImage?.url as string)?.trim() || '';
    const imgSrc = proxiedUrl || rawImageUrl;
    const imgAlt = (object.productImage?.alt as string) || object.productName || '产品图片';
    // SKU 数据：优先新版 skus，兼容旧版 productVariants
    const skus = (object as any).skus as any[] | undefined;
    const hasSkus = skus && skus.length > 0;
    const selectedSku = hasSkus ? skus[selectedSkuIndex] : null;

    // ★ FlawRadar 数据格式兼容转换（普通变量，不用 Hook 避免 early return 问题）
    const rawFlawRadar = (object as any).visData?.flawRadar as any;
    let flawRadar: Record<string, number> | undefined;
    if (rawFlawRadar) {
      if (typeof rawFlawRadar.labels === 'undefined' && Array.isArray(rawFlawRadar.scores) === false) {
        flawRadar = rawFlawRadar as Record<string, number>;
      } else {
        const labels: string[] = rawFlawRadar.labels || [];
        const scores: number[] = rawFlawRadar.scores || [];
        flawRadar = {};
        labels.forEach((label: string, i: number) => {
          flawRadar![label] = typeof scores[i] === 'number' ? scores[i] : 5;
        });
      }
    }

    return (
      <div className="space-y-6" ref={reportContainerRef}>
        {/* 流中断警告横幅（有部分数据时） */}
        {showStreamError && (
          <StreamErrorBanner
            message={streamErrorMessage}
            onRetry={() => {
              hasPartialContentRef.current = false;
              submit({ query });
            }}
          />
        )}

        {/* 离线模式提示：本地兜底报告 */}
        {localReport && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>AI 服务暂时不可用，当前展示的是基于通用消费经验的模拟分析报告，仅供参考。</span>
            </div>
          </div>
        )}

        {/* JSON-LD 结构化数据：注入 Schema.org Product 到 <head>，提升搜索引擎自然流量 */}
        <ProductStructuredData
          productName={object.productName ?? query}
          score={object.score ?? 5}
          productImage={
            object.productImage as { url: string; alt: string } | undefined
          }
          flaws={flaws.map((f: { title?: string; analysis?: string }) => ({
            title: f?.title ?? '',
            analysis: f?.analysis ?? '',
          }))}
          query={query}
        />

        {/* 加载进度条 */}
        {isLoading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full animate-progress-bar rounded-full bg-red-400" />
          </div>
        )}

        {/* ===== 主标题：商品名移出卡片 ===== */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
              ⚠ 避坑报告
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
              「{object.productName ?? '...'}」
            </h1>
          </div>
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-red-300 hover:text-red-500"
            >
              停止生成
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                hasPartialContentRef.current = false;
                submit({ query });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition-all hover:border-red-300 hover:text-red-500 hover:shadow-md"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              重新检测
            </button>
          )}
        </div>

        {/* ===== 主仪表盘卡片：左产品信息 | 右图表评分 ===== */}
        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col lg:flex-row">
            {/* ---------- 左侧列：产品信息区 ---------- */}
            <div className="flex flex-col border-gray-100 bg-gray-50/40 p-5 lg:w-[48%] lg:border-r lg:p-6">
              {/* ===== SKU 型号选择器（新版交互） ===== */}
              {hasSkus ? (
                <div className="space-y-4">
                  {/* 标题 */}
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    型号 / 配置选择
                  </h4>

                  {/* SKU 按钮组 — Apple / 小米官网选购风格 */}
                  <div className="flex flex-wrap gap-2">
                    {skus.map((sku: any, i: number) => {
                      const isSelected = i === selectedSkuIndex;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedSkuIndex(i)}
                          className={`rounded-lg px-3.5 py-2 text-left text-xs font-medium leading-tight transition-all duration-200
                            ${isSelected
                              ? 'border-2 border-red-500 bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200'
                              : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800'
                            }`}
                        >
                          {sku.name ?? `配置 ${i + 1}`}
                        </button>
                      );
                    })}
                  </div>

                  {/* 选中 SKU 的详情面板 */}
                  {selectedSku && (
                    <div className="rounded-lg border border-gray-200 bg-white p-3.5 space-y-2.5">
                      {/* 参考价格 */}
                      <div className="flex items-center gap-2">
                        <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-bold text-gray-900">
                          {selectedSku.priceStr ?? '价格待确认'}
                        </span>
                      </div>

                      {/* 核心参数 */}
                      <div className="flex items-start gap-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs text-gray-600 leading-relaxed">
                          {selectedSku.specs ?? '暂无参数'}
                        </span>
                      </div>

                      {/* 特定坑点 — 警示红高亮 */}
                      {selectedSku.specificFlaw && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2">
                          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                          </svg>
                          <span className="text-xs font-medium text-red-700 leading-relaxed">
                            {selectedSku.specificFlaw}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : object.productVariants && object.productVariants.length > 0 ? (
                /* 兼容旧版 productVariants 降级展示 */
                <div>
                  <h4 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    细分型号透视
                  </h4>
                  <div className="space-y-1.5">
                    {object.productVariants.map((v: { variant_name: string; variant_value: string }, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-100/60"
                      >
                        <span className="text-xs font-medium text-gray-400">
                          {v.variant_name}
                        </span>
                        <span className="ml-2 text-right text-sm font-semibold text-gray-800">
                          {v.variant_value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 数据溯源小面板 */}
              {object.sourceStats && (
                <div className="mt-5">
                  <SourceStatsPanel
                    sampleSize={object.sourceStats.sampleSize}
                    platforms={object.sourceStats.platforms}
                  />
                </div>
              )}

            </div>

            {/* ---------- 右侧列：雷达图 + 评分仪表盘 ---------- */}
            <div className="flex flex-col items-center justify-center gap-2 p-5 lg:w-[52%] lg:p-6 lg:gap-4">
              {/* 槽点分布雷达图 */}
              <div className="w-full max-w-[280px]">
                <FlawRadar data={flawRadar} />
              </div>
              {hasScore ? (
                <div className="text-center">
                  <RiskGauge score={object.score!} />
                  {isLoading && (
                    <p className="mt-2 text-xs text-gray-400">
                      数据持续加载中...
                    </p>
                  )}
                </div>
              ) : (
                <ScorePlaceholder />
              )}
            </div>
          </div>
        </section>

        {/* ===== 争议点标注板块 ===== */}
        <DisputeLabels flaws={flaws} />

        {/* 分享海报 & 导出报告（步骤9：登录门控） */}
        {hasScore && flaws.length > 0 && (
          <div className="flex justify-end gap-2">
            {/* 导出报告按钮 — 登录后可用 */}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 shadow-sm transition-all hover:border-emerald-300 hover:text-emerald-600 hover:shadow-md active:scale-95"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                导出报告
              </button>
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-400 shadow-sm transition-all hover:border-gray-300"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                导出报告
              </Link>
            )}
            {/* 分享海报按钮 */}
            {isAuthenticated ? (
              <SharePoster
                productName={object.productName ?? query}
                score={object.score!}
                flaws={flaws}
                query={query}
              />
            ) : (
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                分享报告
              </Link>
            )}
          </div>
        )}

        {/* 全网参考底价卡片（实时价格优先，AI预估兜底） */}
        {(() => {
          const displayPrices = (realPriceItems && realPriceItems.length > 0)
            ? realPriceItems
            : object?.priceReference;
          if (!displayPrices || displayPrices.length === 0) return null;
          return (
            <PriceReferenceCard
              items={displayPrices}
              isLive={!!realPriceItems?.length}
            />
          );
        })()}

        {/* 参数透视 — 在坑点列表上方，体现「扒皮」犀利感 */}
        {object.specsCheck && object.specsCheck.length > 0 && (
          <SpecsCheckTable items={object.specsCheck} isLoading={isLoading} />
        )}

        {/* 坑点列表 */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-400">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            核心坑点
            {flaws.length > 0 && (
              <span className="rounded-full bg-red-50 px-2 text-xs font-normal text-red-500">
                {flaws.length}
              </span>
            )}
          </h3>

          {flaws.length === 0 && isLoading && (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-6"
                >
                  <div className="mb-2 h-5 w-32 rounded bg-gray-200" />
                  <div className="mb-3 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {flaws.length > 0 &&
            flaws.map((flaw: { title?: string; quote?: string; analysis?: string }, i: number) => {
              const currentVote = votes[i];
              const isSubmitting = submittingIndex === i;
              const flawTitle = flaw?.title ?? `坑点${i + 1}`;

              return (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                      {i + 1}
                    </span>
                    <h4 className="flex-1 text-base font-bold text-gray-900">
                      {flawTitle}
                    </h4>
                  </div>

                  {/* 引用原文 */}
                  {flaw?.quote ? (
                    <blockquote className="mb-3 rounded-md border-l-2 border-red-200 bg-red-50/50 px-4 py-2">
                      <p className="text-sm italic leading-relaxed text-gray-500">
                        「{flaw.quote}」
                      </p>
                    </blockquote>
                  ) : (
                    <div className="mb-3 h-8 animate-pulse rounded-md bg-gray-100" />
                  )}

                  {/* 分析 */}
                  {flaw?.analysis ? (
                    <MarkdownRenderer
                      content={flaw.analysis}
                      isStreaming={isLoading}
                    />
                  ) : (
                    <p className="animate-pulse text-sm text-gray-300">
                      分析生成中...
                    </p>
                  )}

                  {/* 👍 👎 反馈按钮 */}
                  <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-400">
                      这个坑点分析有用吗？
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleFeedback(flawTitle, i, 1)}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all
                          ${
                            currentVote === 1
                              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                              : 'bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'
                          }
                          ${isSubmitting ? 'pointer-events-none opacity-50' : ''}
                        `}
                        title="有用"
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                          />
                        </svg>
                        {currentVote === 1 ? '已赞' : '赞'}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleFeedback(flawTitle, i, -1)}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all
                          ${
                            currentVote === -1
                              ? 'bg-red-100 text-red-700 ring-1 ring-red-300'
                              : 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600'
                          }
                          ${isSubmitting ? 'pointer-events-none opacity-50' : ''}
                        `}
                        title="没用"
                      >
                        <svg
                          className="h-3.5 w-3.5 rotate-180"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                          />
                        </svg>
                        {currentVote === -1 ? '已踩' : '踩'}
                      </button>
                    </div>
                    {isSubmitting && (
                      <span className="ml-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
                    )}
                  </div>
                </div>
              );
            })}
        </section>

        {/* 替代品推荐 */}
        {alternatives.length > 0 && (
          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-500">
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              更靠谱的替代品
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {alternatives.map((alt: { productName?: string; price?: string; advantage?: string }, i: number) => (
                <div
                  key={i}
                  className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-5 transition-shadow hover:shadow-sm"
                >
                  <h4 className="font-bold text-gray-900">
                    {alt?.productName ?? '...'}
                  </h4>
                  <p className="mt-1 text-sm font-medium text-emerald-600">
                    {alt?.price ?? '...'}
                  </p>
                  {alt?.advantage && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {alt.advantage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 商业化入口：购买跳转按钮 */}
        <CommerceBanner
          productName={object.productName ?? query}
          variant="standalone"
        />

        {/* 第三方验证搜索 */}
        <VerifySearch productName={object.productName ?? query} />

        {/* 分享海报按钮（底部） */}
        {hasScore && flaws.length > 0 && (
          <div className="flex justify-center border-t border-gray-100 pt-6">
            <SharePoster
              productName={object.productName ?? query}
              score={object.score!}
              flaws={flaws}
              query={query}
            />
          </div>
        )}

        {/* 底部提示 */}
        {isLoading && (
          <p className="text-center text-xs text-gray-400">
            AI 正在结合真实评价持续分析中...
          </p>
        )}

        {/* ===== 导出报告弹窗 ===== */}
        {exportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setExportOpen(false)}
          >
            <div
              className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">导出避坑报告</h3>
                  <p className="text-xs text-gray-400">将完整报告保存为高清 PNG 图片</p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  报告将以 <strong>2倍分辨率 PNG</strong> 格式导出，包含完整的评分、坑点分析、参数对比等内容。
                </p>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setExportOpen(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleExportReport}
                  disabled={exporting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60"
                >
                  {exporting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      导出中...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      确认导出
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== 4. 品类分析模式 =====
  if (object?.intent === 'category') {
    const comparisons = object.comparisons || [];

    return (
      <div className="space-y-6">
        {/* 流中断警告横幅（有部分数据时） */}
        {showStreamError && (
          <StreamErrorBanner
            message={streamErrorMessage}
            onRetry={() => {
              hasPartialContentRef.current = false;
              submit({ query });
            }}
          />
        )}

        {/* 加载进度条 */}
        {isLoading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full animate-progress-bar rounded-full bg-red-400" />
          </div>
        )}

        {/* 品类名称 + 概览 */}
        <section className="rounded-xl border border-gray-100 bg-gray-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              {object.categoryName ?? '...'}
            </h2>
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-red-300 hover:text-red-500"
              >
                停止生成
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  hasPartialContentRef.current = false;
                  submit({ query });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition-all hover:border-red-300 hover:text-red-500 hover:shadow-md"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                重新检测
              </button>
            )}
          </div>

          {object.overview ? (
            <MarkdownRenderer
              content={object.overview}
              isStreaming={isLoading}
            />
          ) : (
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-full rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
            </div>
          )}
        </section>

        {/* 横向对比 */}
        <section className="space-y-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
            横向对比
            {comparisons.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 text-xs font-normal text-gray-500">
                {comparisons.length} 款
              </span>
            )}
          </h3>

          {comparisons.length === 0 && isLoading && (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <div className="mb-3 h-5 w-40 rounded bg-gray-200" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {comparisons.length > 0 && (
            <div className="overflow-x-auto">
              {/* 桌面表格 */}
              <table className="hidden min-w-full sm:table">
                <thead>
                  <tr className="border-b-2 border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4">商品名称</th>
                    <th className="pb-3 pr-4">价格区间</th>
                    <th className="pb-3 pr-4">主要坑点</th>
                    <th className="pb-3 text-center">评分</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {comparisons.map((item: { productName?: string; priceRange?: string; mainFlaw?: string; score?: number }, i: number) => {
                    const s = typeof item?.score === 'number' ? item.score : null;
                    const c = s !== null ? scoreColor(s) : null;
                    return (
                      <tr key={i} className="transition-colors hover:bg-gray-50/50">
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {item?.productName ?? '...'}
                        </td>
                        <td className="py-3 pr-4 text-sm text-gray-500">
                          {item?.priceRange ?? '...'}
                        </td>
                        <td className="py-3 pr-4 max-w-xs text-sm text-gray-600">
                          {item?.mainFlaw ?? (
                            <span className="animate-pulse text-gray-300">
                              ...
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {s !== null && c ? (
                            <span
                              className="inline-block rounded-full px-3 py-0.5 text-xs font-bold"
                              style={{
                                backgroundColor: `${c.ring}18`,
                                color: c.ring,
                              }}
                            >
                              {s.toFixed(1)}
                            </span>
                          ) : (
                            <span className="inline-block h-5 w-10 animate-pulse rounded bg-gray-200" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 移动端卡片 */}
              <div className="space-y-3 sm:hidden">
                {comparisons.map((item: { productName?: string; priceRange?: string; mainFlaw?: string; score?: number }, i: number) => {
                  const s =
                    typeof item?.score === 'number' ? item.score : null;
                  const c = s !== null ? scoreColor(s) : null;
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-gray-100 bg-white p-4"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-gray-900">
                          {item?.productName ?? '...'}
                        </h4>
                        {s !== null && c ? (
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                            style={{
                              backgroundColor: `${c.ring}18`,
                              color: c.ring,
                            }}
                          >
                            {s.toFixed(1)}
                          </span>
                        ) : (
                          <span className="h-5 w-10 animate-pulse rounded bg-gray-200" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {item?.priceRange ?? '...'}
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        {item?.mainFlaw ?? (
                          <span className="text-gray-300">...</span>
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {isLoading && (
          <p className="text-center text-xs text-gray-400">
            AI 正在结合真实评价持续分析中...
          </p>
        )}
      </div>
    );
  }

  // ===== 5. 兜底（不应到达） =====
  return <SkeletonLoader />;
}
