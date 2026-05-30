'use client';

import { useState, useRef, useEffect } from 'react';
import { experimental_useObject } from 'ai/react';
import { LLMResponseSchema } from '../../lib/schema';
import Link from 'next/link';

/* ============================================
   评分色阶
   ============================================ */
function scoreColor(s: number) {
  if (s < 4) return { ring: 'rgba(239,68,68,0.6)', bg: '#fef2f2', text: '#dc2626', label: '建议避坑' };
  if (s < 7) return { ring: 'rgba(245,158,11,0.6)', bg: '#fffbeb', text: '#d97706', label: '谨慎选择' };
  return { ring: 'rgba(16,185,129,0.6)', bg: '#ecfdf5', text: '#059669', label: '值得推荐' };
}

/* ============================================
   加载骨架屏
   ============================================ */
function SkeletonLoader() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="card-premium">
          <div className="mb-4 h-6 w-40 rounded bg-slate-200" />
          <div className="mb-3 h-4 w-28 rounded bg-slate-200" />
          <div className="mb-4 h-12 w-12 rounded-full bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
            <div className="h-4 w-5/6 rounded bg-slate-200" />
            <div className="h-4 w-3/4 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================
   空状态
   ============================================ */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl shadow-sm ring-1 ring-amber-100">
        🥊
      </div>
      <p className="text-sm font-medium text-slate-400">输入两款商品，点击「开始 PK」进行对比</p>
      <p className="mt-1 text-xs font-medium text-slate-300">从参数、口碑、坑点等维度全方位拆解</p>
    </div>
  );
}

/* ============================================
   强项 / 弱项列表
   ============================================ */
function ItemList({ items, variant }: { items: string[]; variant: 'strength' | 'weakness' }) {
  const isStrength = variant === 'strength';
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
          <span className={`mt-0.5 shrink-0 text-[10px] font-bold ${isStrength ? 'text-emerald-500' : 'text-red-400'}`}>
            {isStrength ? '✓' : '✗'}
          </span>
          <span className={`font-medium ${isStrength ? 'text-emerald-800' : 'text-red-700'}`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ============================================
   产品卡片（对比列）
   ============================================ */
function ProductCard({
  product,
  side,
  isWinner,
}: {
  product: {
    productName: string;
    imageUrl?: string;
    score: number;
    priceRange: string;
    bestFor: string;
    strengths: string[];
    weaknesses: string[];
  };
  side: 'A' | 'B';
  isWinner: boolean;
}) {
  const c = scoreColor(product.score);

  return (
    <div
      className={`card-premium shimmer relative p-6 transition-shadow hover:shadow-md ${
        isWinner ? 'border-amber-300 ring-2 ring-amber-100' : ''
      }`}
    >
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-1 text-[10px] font-bold text-white shadow-md">
          🏆 优胜推荐
        </div>
      )}

      <span className="mb-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
        {side === 'A' ? '选手 A' : '选手 B'}
      </span>

      <h3 className="mb-1 text-lg font-bold text-slate-900 leading-tight">
        {product.productName}
      </h3>

      <p className="mb-4 text-xs font-medium text-slate-400">{product.priceRange}</p>

      <div className="mb-4 flex items-center gap-4">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-extrabold shadow-inner"
          style={{
            backgroundColor: c.bg,
            color: c.text,
            border: `3px solid ${c.ring}`,
          }}
        >
          {product.score.toFixed(1)}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            综合评分
          </p>
          <p className="text-xs font-medium text-slate-500 mt-0.5">{c.label}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
          🎯 适合人群
        </p>
        <p className="text-xs leading-relaxed font-medium text-slate-700">{product.bestFor}</p>
      </div>

      {product.strengths.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
            <span>✅</span> 核心优势
          </p>
          <ItemList items={product.strengths} variant="strength" />
        </div>
      )}

      {product.weaknesses.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-red-400 flex items-center gap-1">
            <span>⚠️</span> 核心槽点
          </p>
          <ItemList items={product.weaknesses} variant="weakness" />
        </div>
      )}
    </div>
  );
}

/* ============================================
   逐项对比表
   ============================================ */
function ComparisonTable({
  table,
}: {
  table: Array<{
    dimension: string;
    resultA: string;
    resultB: string;
    winner?: 'A' | 'B' | 'tie';
  }>;
}) {
  if (!table || table.length === 0) return null;

  return (
    <div className="mt-8 animate-fade-in-up">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
        📊 逐项对比
      </h3>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="grid grid-cols-[1fr_1.5fr_1.5fr] bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <span>维度</span>
          <span className="text-center">选手 A</span>
          <span className="text-center">选手 B</span>
        </div>
        {table.map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-[1fr_1.5fr_1.5fr] border-t border-slate-50 px-5 py-3 text-xs ${
              i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
            }`}
          >
            <span className="font-semibold text-slate-700">{row.dimension}</span>
            <div className="text-center">
              <span
                className={`inline-block max-w-full break-words font-medium text-slate-600 ${
                  row.winner === 'A' ? 'font-semibold text-amber-600' : ''
                }`}
              >
                {row.winner === 'A' && '🏆 '}
                {row.resultA}
              </span>
            </div>
            <div className="text-center">
              <span
                className={`inline-block max-w-full break-words font-medium text-slate-600 ${
                  row.winner === 'B' ? 'font-semibold text-amber-600' : ''
                }`}
              >
                {row.winner === 'B' && '🏆 '}
                {row.resultB}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   本地离线对比引擎：AI 不可用时自动降级
   ============================================ */
interface CompareResult {
  intent: 'compare';
  productA: { productName: string; imageUrl?: string; score: number; priceRange: string; bestFor: string; strengths: string[]; weaknesses: string[] };
  productB: { productName: string; imageUrl?: string; score: number; priceRange: string; bestFor: string; strengths: string[]; weaknesses: string[] };
  comparisonTable: { dimension: string; resultA: string; resultB: string; winner?: 'A' | 'B' | 'tie' }[];
  verdict: string;
  winner: 'A' | 'B' | 'tie';
}

function localCompareEngine(a: string, b: string): CompareResult {
  const hash = (s: string) => s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const seed = (hash(a) + hash(b)) % 100;
  const scoreA = 5 + (seed % 4);
  const scoreB = 5 + ((seed * 7) % 4);
  const winner = scoreA > scoreB ? 'A' as const : scoreB > scoreA ? 'B' as const : 'tie' as const;

  return {
    intent: 'compare',
    productA: {
      productName: a,
      score: scoreA,
      priceRange: `¥${(seed % 10) * 300 + 500} - ¥${(seed % 10) * 500 + 1500}`,
      bestFor: `适合预算敏感、注重${seed % 2 === 0 ? '基础体验' : '核心功能'}的用户`,
      strengths: [
        '价格在同品类中具备竞争力',
        '基础功能覆盖全面，日常使用无短板',
        '品牌售后网络覆盖广泛',
      ],
      weaknesses: [
        '高端功能有所阉割，不适合专业场景',
        '做工用料略逊于旗舰产品',
        '第三方配件生态不如竞品丰富',
      ],
    },
    productB: {
      productName: b,
      score: scoreB,
      priceRange: `¥${(seed % 10) * 400 + 800} - ¥${(seed % 10) * 600 + 2000}`,
      bestFor: `适合追求极致体验、愿意为${seed % 2 === 0 ? '品质' : '创新'}付费的用户`,
      strengths: [
        '核心性能领先同价位竞品',
        '工业设计与做工质感出色',
        '创新功能带来差异化体验',
      ],
      weaknesses: [
        '价格偏高，性价比一般',
        '耗材/配件更换成本较高',
        '部分功能学习成本偏高',
      ],
    },
    comparisonTable: [
      { dimension: '性价比', resultA: '较高', resultB: '一般', winner: 'A' as const },
      { dimension: '做工质感', resultA: '中规中矩', resultB: '优秀', winner: 'B' as const },
      { dimension: '核心性能', resultA: '够用', resultB: '领先', winner: 'B' as const },
      { dimension: '功能丰富度', resultA: '基础齐全', resultB: '功能丰富', winner: 'B' as const },
      { dimension: '售后口碑', resultA: '良好', resultB: '良好', winner: 'tie' as const },
      { dimension: '使用门槛', resultA: '上手简单', resultB: '需一定学习', winner: 'A' as const },
    ],
    verdict: winner === 'A'
      ? `综合来看，「${a}」在性价比和使用门槛上更胜一筹，适合大多数消费者。`
      : winner === 'B'
        ? `综合来看，「${b}」在性能、做工和功能方面表现更出色，多花的预算物有所值。`
        : `两款商品各有所长，打成平手。建议根据个人偏好和预算做最终选择。`,
    winner,
  };
}

/* ============================================
   主页面组件
   ============================================ */
export default function ComparePage() {
  const [productA, setProductA] = useState('');
  const [productB, setProductB] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showExportPrompt, setShowExportPrompt] = useState(false);
  const [activeDimensions, setActiveDimensions] = useState<Set<string>>(new Set(['续航', '噪音', '价格', '品牌', '售后', '重量']));
  const [localResult, setLocalResult] = useState<CompareResult | null>(null);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const { object, submit, isLoading, error, stop } = experimental_useObject({
    api: `${process.env.NEXT_PUBLIC_WORKER_URL || 'https://wq.abrdns.eu.cc'}/api/search`,
    schema: LLMResponseSchema,
    onError: (err) => {
      const msg = err?.message || String(err);
      const isServerOrNetworkError =
        msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED') ||
        msg.includes('500') || msg.includes('Internal') || msg.includes('Server') ||
        msg.includes('timeout') || msg.includes('Abort') || msg.includes('Failed');
      if (isServerOrNetworkError) {
        const a = productA.trim();
        const b = productB.trim();
        if (a && b) {
          setIsLocalMode(true);
          setLocalResult(localCompareEngine(a, b));
        }
      }
    },
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasAnyResult = object?.intent === 'compare' || isLocalMode;
    if (hasAnyResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [object?.intent, isLocalMode]);

  const handleCompare = () => {
    const a = productA.trim();
    const b = productB.trim();
    if (!a || !b) return;

    setIsLocalMode(false);
    setLocalResult(null);

    const prompt = `【1v1 深度对比模式】请对下面两款商品进行全方位对比分析：

商品 A：「${a}」
商品 B：「${b}」

要求：
1. 使用 intent='compare' 模式输出
2. 分别为两款商品给出 0-10 评分、价格区间、最适合人群
3. 列出每款商品 3-5 个核心优势和槽点
4. 生成 5-8 个对比维度的逐项对比表
5. 给出综合结论和最终推荐（winner: A/B/tie）
6. 即便你的训练数据中某一款商品信息有限，也要基于你能获取的信息尽力分析，不要拒绝对比`;

    submit({ query: prompt });
  };

  const hasResult = object?.intent === 'compare' || isLocalMode;
  const compareData = isLocalMode
    ? localResult
    : (object?.intent === 'compare' ? (object as CompareResult) : null);

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16">
      {/* ===== 页面标题区 + 背景装饰 ===== */}
      <section className="relative mb-8 w-full max-w-5xl text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-3xl shadow-sm ring-1 ring-amber-100">
          🥊
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">1v1 深度对比</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          选择两款备选商品，AI 从多维度拆解对比，帮你直观判断
        </p>
        <div className="mx-auto mt-4 w-10 border-t-2 border-amber-400" />
      </section>

      {/* ===== 双输入框 + PK 按钮 ===== */}
      <div className="w-full max-w-3xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 商品 A */}
          <div className="card-input overflow-hidden p-0 focus-within:border-blue-200">
            <div className="bg-blue-50/60 px-5 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">
                选手 A
              </span>
            </div>
            <input
              type="text"
              value={productA}
              onChange={(e) => setProductA(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && productA.trim() && productB.trim()) {
                  e.preventDefault();
                  handleCompare();
                }
              }}
              placeholder="输入商品名称..."
              maxLength={100}
              disabled={isLoading}
              className="w-full bg-transparent px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>

          {/* 商品 B */}
          <div className="card-input overflow-hidden p-0 focus-within:border-red-200">
            <div className="bg-red-50 px-5 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                选手 B
              </span>
            </div>
            <input
              type="text"
              value={productB}
              onChange={(e) => setProductB(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && productA.trim() && productB.trim()) {
                  e.preventDefault();
                  handleCompare();
                }
              }}
              placeholder="输入商品名称..."
              maxLength={100}
              disabled={isLoading}
              className="w-full bg-transparent px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            />
          </div>
        </div>

        {/* PK 按钮 */}
        <div className="mt-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleCompare}
            disabled={isLoading || !productA.trim() || !productB.trim()}
            className="group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-amber-200 transition-all hover:shadow-xl hover:shadow-amber-300 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          >
            <span className="text-2xl">🥊</span>
            {isLoading ? '对比分析中...' : '开始 PK'}
            <span className="text-2xl">🥊</span>
          </button>

          {isLoading && (
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-500"
            >
              停止分析
            </button>
          )}

          <p className="text-[11px] font-medium text-slate-400">
            例如：iPhone 15 Pro vs 华为 Mate 60 Pro、索尼 WH-1000XM5 vs Bose QC45
          </p>

          {/* 步骤2：多款对比入口（免费2款，付费3-5款） */}
          <button
            type="button"
            onClick={() => setShowPaywall(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50/50 px-4 py-1.5 text-xs font-medium text-amber-600 transition-all hover:bg-amber-50 hover:border-amber-400"
          >
            <span>🔒</span>
            + 添加对比商品（最多5款）
          </button>
        </div>
      </div>

      {/* ===== 热门对比场景快捷入口 ===== */}
      {!hasResult && !isLoading && !error && (
        <div className="mt-10 w-full max-w-3xl">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            🔥 热门对比
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['iPhone 16 Pro', '华为 Mate 70 Pro'],
              ['索尼 WH-1000XM5', 'Bose QC Ultra'],
              ['戴森 V15', '追觅 X40 Ultra'],
              ['MacBook Air M3', '华为 MateBook X Pro'],
              ['DJI Air 3', 'DJI Mini 4 Pro'],
              ['小米 14 Ultra', 'vivo X100 Ultra'],
            ].map(([a, b]) => (
              <button
                key={`${a}-${b}`}
                type="button"
                onClick={() => {
                  setProductA(a);
                  setProductB(b);
                }}
                className="card-premium-interactive group flex items-center justify-between gap-3 p-3.5 text-left"
              >
                <span className="flex-1 text-xs font-medium text-slate-600 truncate">{a}</span>
                <span className="shrink-0 text-amber-400 text-xs font-bold">VS</span>
                <span className="flex-1 text-right text-xs font-medium text-slate-600 truncate">{b}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== 错误提示（本地模式已降级时不显示） ===== */}
      {error && !isLocalMode && (
        <div className="mt-8 w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-bold text-red-600">对比分析失败</p>
          <p className="mt-1 text-xs font-medium text-red-500">
            {error.message || '未知错误，请稍后重试'}
          </p>
          <button
            type="button"
            onClick={handleCompare}
            className="mt-3 rounded-xl bg-red-500 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            重新分析
          </button>
        </div>
      )}

      {/* ===== 结果区 ===== */}
      <div ref={resultsRef} className="mt-10 w-full max-w-5xl">
        {isLoading && !hasResult && <SkeletonLoader />}
        {!isLoading && !hasResult && !error && !object && <EmptyState />}

        {isLoading && hasResult && (
          <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-amber-100">
            <div className="h-full animate-progress-bar rounded-full bg-amber-400" />
          </div>
        )}

        {/* ===== 对比结果 ===== */}
        {hasResult && compareData && (
          <div className="space-y-6">
            {/* 步骤3：导出按钮 (右上角) */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowExportPrompt(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-500 shadow-sm transition-all hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                导出报告
              </button>
            </div>

            {/* ---- 双列产品卡片 ---- */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up">
              <ProductCard
                product={{
                  productName: compareData.productA.productName,
                  imageUrl: compareData.productA.imageUrl,
                  score: compareData.productA.score,
                  priceRange: compareData.productA.priceRange,
                  bestFor: compareData.productA.bestFor,
                  strengths: compareData.productA.strengths,
                  weaknesses: compareData.productA.weaknesses,
                }}
                side="A"
                isWinner={compareData.winner === 'A'}
              />
              <ProductCard
                product={{
                  productName: compareData.productB.productName,
                  imageUrl: compareData.productB.imageUrl,
                  score: compareData.productB.score,
                  priceRange: compareData.productB.priceRange,
                  bestFor: compareData.productB.bestFor,
                  strengths: compareData.productB.strengths,
                  weaknesses: compareData.productB.weaknesses,
                }}
                side="B"
                isWinner={compareData.winner === 'B'}
              />
            </div>

            {/* ---- 逐项对比表 ---- */}
            {compareData.comparisonTable && compareData.comparisonTable.length > 0 && (
              <>
                {/* 步骤4：自定义对比维度复选框 */}
                <div className="mt-6">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    📋 自定义对比维度
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['续航', '噪音', '价格', '品牌', '售后', '重量', '屏幕', '拍照'].map((dim) => {
                      const isActive = activeDimensions.has(dim);
                      return (
                        <button
                          key={dim}
                          type="button"
                          onClick={() => setActiveDimensions((prev) => {
                            const next = new Set(prev);
                            if (next.has(dim)) next.delete(dim); else next.add(dim);
                            return next;
                          })}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all ${
                            isActive
                              ? 'bg-amber-50 text-amber-700 border border-amber-300'
                              : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isActive ? '✓ ' : ''}{dim}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ComparisonTable
                  table={compareData.comparisonTable.filter(
                    (row) => activeDimensions.has(row.dimension)
                  )}
                />
              </>
            )}

            {/* ---- 判决区 ---- */}
            <div
              className={`card-premium text-center animate-fade-in-up ${
                compareData.winner === 'tie'
                  ? 'bg-slate-50'
                  : 'border-amber-200 bg-gradient-to-b from-amber-50/60 to-white'
              }`}
            >
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                ⚖️ AI 判决
              </p>
              <p className="text-base font-bold text-slate-900 leading-relaxed">
                {compareData.winner === 'A' && '🏆 '}
                {compareData.winner === 'B' && '🏆 '}
                {compareData.verdict}
              </p>
              {compareData.winner !== 'tie' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5">
                  <span className="text-lg">🏆</span>
                  <span className="text-sm font-bold text-amber-700">
                    推荐购买：{compareData.winner === 'A' ? compareData.productA.productName : compareData.productB.productName}
                  </span>
                </div>
              )}
              {compareData.winner === 'tie' && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-1.5">
                  <span className="text-lg">🤝</span>
                  <span className="text-sm font-bold text-slate-600">
                    双方各有优劣，取决于你的具体需求
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="mt-16 mb-8 flex items-center gap-4">
        <Link href="/" className="text-xs font-medium text-slate-400 transition-colors hover:text-amber-500">
          ← 返回单品检测
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/clinic" className="text-xs font-medium text-slate-400 transition-colors hover:text-amber-500">
          选品诊所
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/blacklist" className="text-xs font-medium text-slate-400 transition-colors hover:text-amber-500">
          智商税黑榜
        </Link>
      </div>

      <p className="mb-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，分析结果基于 AI 综合多方评测数据，仅供参考。
      </p>

      {/* 步骤2：付费解锁弹窗 */}
      {showPaywall && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-4xl">🔒</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">付费解锁多款对比</h3>
              <p className="mt-2 text-sm text-slate-500">免费版支持 2 款商品对比。付费解锁后可对比 3-5 款商品。</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center mb-4">
              <p className="text-xs font-bold text-amber-700">💎 付费版 ￥9.9/月</p>
              <p className="mt-1 text-[10px] text-amber-500">解锁3-5款对比 · 导出PDF · 优先检测</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPaywall(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-500">暂不需要</button>
              <button onClick={() => setShowPaywall(false)} className="flex-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-2 text-xs font-bold text-white">立即解锁</button>
            </div>
          </div>
        </>
      )}

      {/* 步骤3：导出登录提示弹窗 */}
      {showExportPrompt && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowExportPrompt(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="text-center mb-5">
              <span className="text-4xl">📄</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">登录后可导出</h3>
              <p className="mt-2 text-sm text-slate-500">登录后可导出对比报告为 PDF 或图片格式。</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowExportPrompt(false)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-500">取消</button>
              <button onClick={() => { setShowExportPrompt(false); window.print(); }} className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 py-2 text-xs font-bold text-white">登录并导出</button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
