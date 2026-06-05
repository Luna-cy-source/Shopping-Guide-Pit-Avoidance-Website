// =====================================================
// 数据背书组件 — 从 Worker API 动态读取数据集统计
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

// ---- 类型定义 ----
interface HazardItem {
  name: string;
  count: number;
  pct: number;
}

interface YearlyItem {
  year: string;
  count: number;
}

interface RecallSummary {
  source: string;
  sourceUrl: string;
  totalRecords: number;
  summary: string;
  hazardDistribution: HazardItem[];
  topManufacturers: [string, number][];
  yearlyTrend: YearlyItem[];
}

interface ReviewSummary {
  source: string;
  sourceUrl: string;
  totalRecords: number;
  description: string;
  fakeVsReal: { fake: { count: number; pct: number }; real: { count: number; pct: number } };
  polarityBreakdown: {
    fake: { positive: number; negative: number };
    real: { positive: number; negative: number };
  };
  keyInsight: string;
}

// 条形图颜色
const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500',
  'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
];

// ---- 骨架屏 ----
function Skeleton() {
  return (
    <section className="w-full bg-white px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mx-auto h-4 w-48 rounded bg-slate-100 animate-pulse" />
          <div className="mx-auto mt-2 h-3 w-72 rounded bg-slate-50 animate-pulse" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-6 animate-pulse">
              <div className="h-5 w-24 rounded bg-slate-200 mb-3" />
              <div className="h-6 w-48 rounded bg-slate-200 mb-2" />
              <div className="h-4 w-full rounded bg-slate-100 mb-4" />
              <div className="space-y-2">
                {[1,2,3,4,5].map((j) => (
                  <div key={j} className="h-4 w-full rounded bg-slate-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- 主组件 ----
export default function DataCredibility() {
  const [recall, setRecall] = useState<RecallSummary | null>(null);
  const [review, setReview] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [r1, r2] = await Promise.all([
          fetch(apiUrl('/api/datasets/recalls')).then((r) => r.json()),
          fetch(apiUrl('/api/datasets/reviews')).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setRecall(r1);
          setReview(r2);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (loading || !recall || !review) return <Skeleton />;

  const maxCount = recall.hazardDistribution[0]?.count || 1;

  return (
    <section className="w-full bg-white px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
            数据背书 · 真实世界数据支撑
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            以下数据来自 GitHub 公开数据集，经独立分析处理后呈现，为消费者决策提供客观参考
          </p>
        </div>

        {/* 双列卡片 */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* 卡片 1：产品召回 */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-red-50/30 to-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                消费品召回
              </span>
              <span className="text-[11px] text-slate-400">CPSC 公开数据</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {recall.totalRecords.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">条产品召回记录</span>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              {recall.summary}
            </p>

            {/* 风险分布条形图 */}
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-medium text-slate-400 mb-2">主要风险类型分布</p>
              {recall.hazardDistribution.slice(0, 8).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-[84px] shrink-0 text-right text-[11px] text-slate-500">
                    {item.name}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${COLORS[i] || 'bg-slate-400'} transition-all duration-1000 ease-out`}
                      style={{ width: animated ? `${Math.round((item.count / maxCount) * 100)}%` : '0%' }}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] font-medium text-slate-600 tabular-nums shrink-0">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* 年份趋势 */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[11px] font-medium text-slate-400 mb-2">近 5 年召回数量变化</p>
              <div className="flex items-end gap-1 h-16">
                {recall.yearlyTrend.map((y, i) => {
                  const maxYr = Math.max(...recall.yearlyTrend.map((x) => x.count));
                  const h = Math.max(4, Math.round((y.count / maxYr) * 100));
                  return (
                    <div key={y.year} className="flex-1 flex flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-medium text-slate-600 tabular-nums">{y.count}</span>
                      <div
                        className={`w-full rounded-t ${COLORS[i + 3] || 'bg-slate-400'} transition-all duration-1000`}
                        style={{ height: animated ? `${h}%` : '0%' }}
                      />
                      <span className="text-[10px] text-slate-400">{y.year}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <a
              href={recall.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub 数据源
            </a>
          </div>

          {/* 卡片 2：虚假评论 */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-amber-50/30 to-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                虚假评论识别
              </span>
              <span className="text-[11px] text-slate-400">学术研究语料库</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {review.totalRecords.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">条人工标注评论</span>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              {review.description}
            </p>

            {/* 虚假评论比例 */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400">虚假评论占比</span>
                <span className="text-[11px] font-bold text-red-500">{review.fakeVsReal.fake.pct}%</span>
              </div>
              <div className="h-5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="h-full bg-red-400 rounded-l-full flex items-center justify-center transition-all duration-1000"
                  style={{ width: animated ? `${review.fakeVsReal.fake.pct}%` : '0%' }}
                >
                  <span className="text-[10px] text-white font-medium whitespace-nowrap">
                    {animated ? `虚假 ${review.fakeVsReal.fake.count}` : ''}
                  </span>
                </div>
                <div
                  className="h-full bg-emerald-400 flex items-center justify-center transition-all duration-1000"
                  style={{ width: animated ? `${review.fakeVsReal.real.pct}%` : '0%' }}
                >
                  <span className="text-[10px] text-white font-medium whitespace-nowrap">
                    {animated ? `真实 ${review.fakeVsReal.real.count}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 情感分布 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">
                  {review.polarityBreakdown.real.positive + review.polarityBreakdown.fake.positive}
                </p>
                <p className="text-[11px] text-emerald-500">正面评价</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-500">
                  {review.polarityBreakdown.real.negative + review.polarityBreakdown.fake.negative}
                </p>
                <p className="text-[11px] text-red-400">负面评价</p>
              </div>
            </div>

            {/* 洞察 */}
            <div className="mt-4 rounded-lg bg-amber-50/50 border border-amber-100 p-3">
              <p className="text-[11px] leading-relaxed text-amber-700">
                {review.keyInsight}
              </p>
            </div>

            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub 数据源
            </a>
          </div>
        </div>

        {/* 底部引用 */}
        <p className="mt-6 text-center text-[10px] text-slate-300 leading-relaxed">
          数据集均为公开发布于 GitHub 的开放数据，遵循 MIT 等开源协议。统计结果经独立计算，仅供参考研究使用。
        </p>
      </div>
    </section>
  );
}
