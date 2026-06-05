// =====================================================
// 数据背书组件 — 展示公开数据集统计，增强网站公信力
// 数据来源：GitHub 公开数据集
// =====================================================

'use client';

import { useEffect, useState } from 'react';

interface HazardStat {
  name: string;
  count: number;
  color: string;
  widthPct: number;
}

const RECALL_STATS: HazardStat[] = [
  { name: '火灾/烧伤风险', count: 510, color: 'bg-red-500', widthPct: 0 },
  { name: '窒息风险', count: 475, color: 'bg-orange-500', widthPct: 0 },
  { name: '触电/电击', count: 235, color: 'bg-amber-500', widthPct: 0 },
  { name: '割伤/划伤', count: 232, color: 'bg-yellow-500', widthPct: 0 },
  { name: '跌落风险', count: 156, color: 'bg-lime-500', widthPct: 0 },
  { name: '交通事故', count: 89, color: 'bg-emerald-500', widthPct: 0 },
];

// 计算宽度百分比
const maxCount = RECALL_STATS[0].count;
RECALL_STATS.forEach((s) => {
  s.widthPct = Math.round((s.count / maxCount) * 100);
});

export default function DataCredibility() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="w-full bg-white px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase">
            📊 数据背书 · 真实世界数据支撑
          </h3>
          <p className="mt-2 text-xs text-slate-400">
            以下数据来自 GitHub 公开数据集，经独立分析处理后呈现，为消费者决策提供客观参考
          </p>
        </div>

        {/* 双列卡片 */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* 卡片 1：产品召回 */}
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                消费品召回
              </span>
              <span className="text-[11px] text-slate-400">CPSC 公开数据</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              9,350 <span className="text-sm font-normal text-slate-500">条产品召回记录</span>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              涵盖消费品安全委员会（CPSC）记录的大量产品召回案例，涉及家电、玩具、工具等品类
            </p>

            {/* 风险分布条形图 */}
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-medium text-slate-400 mb-2">🔴 主要风险类型分布</p>
              {RECALL_STATS.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-[80px] shrink-0 text-right text-[11px] text-slate-500">
                    {item.name}
                  </span>
                  <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`}
                      style={{ width: animated ? `${item.widthPct}%` : '0%' }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-medium text-slate-600 tabular-nums">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>

            <a
              href="https://github.com/the-codingschool/datasets"
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
          <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                虚假评论识别
              </span>
              <span className="text-[11px] text-slate-400">学术研究数据集</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              1,600 <span className="text-sm font-normal text-slate-500">条人工标注评论</span>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-500">
              来自 Deceptive Opinion Spam Corpus（黄金标准语料库），由 TripAdvisor 酒店评论经专家人工标注真伪
            </p>

            {/* 虚假评论比例 */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-slate-400">虚假评论占比</span>
                <span className="text-[11px] font-bold text-red-500">50%</span>
              </div>
              <div className="h-5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="h-full bg-red-400 rounded-l-full flex items-center justify-center transition-all duration-1000"
                  style={{ width: animated ? '50%' : '0%' }}
                >
                  <span className="text-[10px] text-white font-medium whitespace-nowrap">
                    {animated ? '虚假 800' : ''}
                  </span>
                </div>
                <div
                  className="h-full bg-emerald-400 flex items-center justify-center transition-all duration-1000"
                  style={{ width: animated ? '50%' : '0%' }}
                >
                  <span className="text-[10px] text-white font-medium whitespace-nowrap">
                    {animated ? '真实 800' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* 情感分布 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-lg font-bold text-emerald-600">800</p>
                <p className="text-[11px] text-emerald-500">正面评价</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-lg font-bold text-red-500">800</p>
                <p className="text-[11px] text-red-400">负面评价</p>
              </div>
            </div>

            <a
              href="https://github.com/chotipy/Deceptive-Opinion-Spam"
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
