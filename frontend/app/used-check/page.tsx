'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { experimental_useObject } from 'ai/react';
import { LLMResponseSchema } from '../../lib/schema';
import Link from 'next/link';

/* ============================================
   类型：从前端 Schema 推导
   ============================================ */
type UsedMarketResult = Extract<
  NonNullable<ReturnType<typeof experimental_useObject>['object']>,
  { intent: 'used_market' }
>;

/* ============================================
   风险等级色系
   ============================================ */
const RISK_STYLES: Record<string, { ring: string; bg: string; text: string; icon: string }> = {
  '极高': { ring: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', icon: '🔴' },
  '中等': { ring: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '🟡' },
  '低': { ring: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '🟢' },
};

/* ============================================
   骨架屏
   ============================================ */
function SkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="card-premium">
        <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-200" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card-premium">
          <div className="mb-3 h-5 w-28 rounded bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-slate-200" />
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl shadow-sm ring-1 ring-blue-100">
        🛡️
      </div>
      <p className="text-sm font-medium text-slate-400">
        输入你想淘的二手商品型号，AI 将为你拆解交易风险与验机步骤
      </p>
      <p className="mt-1 text-xs text-slate-300">
        例如：闲鱼上想淘一台 iPhone 15 Pro，怎么验机？
      </p>
    </div>
  );
}

/* ============================================
   流程进度条
   ============================================ */
function ProgressBar({ active }: { active: boolean }) {
  return (
    <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-blue-100">
      <div
        className={`h-full rounded-full bg-blue-400 transition-all duration-1500 ${active ? 'w-2/3 animate-progress-bar' : 'w-full'}`}
      />
    </div>
  );
}

/* ============================================
   可交互的验机清单组件 (核心)
   ============================================ */
function InspectionChecklist({
  items,
}: {
  items: { step: string; detail: string }[];
}) {
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const totalChecked = Object.values(checkedMap).filter(Boolean).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((totalChecked / total) * 100) : 0;

  const toggle = useCallback((idx: number) => {
    setCheckedMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const toggleAll = useCallback(() => {
    if (totalChecked === total) {
      setCheckedMap({});
    } else {
      const all: Record<number, boolean> = {};
      items.forEach((_, i) => (all[i] = true));
      setCheckedMap(all);
    }
  }, [totalChecked, total, items]);

  if (!items || items.length === 0) return null;

  return (
    <div className="card-premium !p-0 !overflow-hidden">
      {/* 清单头部 */}
      <div className="flex items-center justify-between border-b border-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-sm">
            📋
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">验机清单</h3>
            <p className="text-xs text-slate-400">
              已检查 {totalChecked}/{total} 项 · {progress}%
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-500"
        >
          {totalChecked === total ? '全部取消' : '全部勾选'}
        </button>
      </div>

      {/* 进度条 */}
      <div className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 清单列表 */}
      <div className="divide-y divide-slate-50 px-5 py-3">
        {items.map((item, idx) => {
          const checked = !!checkedMap[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${checked ? 'opacity-70' : ''}`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                  checked
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300 bg-white hover:border-blue-300'
                }`}
              >
                {checked && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold transition-colors ${
                    checked ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}
                >
                  {idx + 1}. {item.step}
                </p>
                <p
                  className={`mt-0.5 text-xs leading-relaxed transition-colors ${
                    checked ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {item.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {totalChecked === total && total > 0 && (
        <div className="border-t border-emerald-100 bg-emerald-50/60 px-5 py-3 text-center">
          <p className="text-xs font-medium text-emerald-600">
            ✅ 全部检查项已完成 — 可以放心交易了
          </p>
        </div>
      )}
    </div>
  );
}

/* ============================================
   骗局话术卡片列表
   ============================================ */
function ScamCards({ routines }: { routines: { title: string; routine: string; counterMeasure: string }[] }) {
  if (!routines || routines.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        🎭 常见骗局话术拆解
        <span className="rounded-full bg-slate-100 px-2 text-xs font-normal text-slate-500">
          {routines.length} 种
        </span>
      </h3>
      <div className="space-y-3">
        {routines.map((scam, i) => (
          <div
            key={i}
            className="rounded-xl border border-red-100 bg-red-50/40 p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                {i + 1}
              </span>
              <h4 className="text-sm font-bold text-red-800">{scam.title}</h4>
            </div>
            <p className="mb-2 ml-7 text-xs leading-relaxed text-red-700">
              <span className="font-semibold">套路：</span>
              {scam.routine}
            </p>
            <p className="ml-7 text-xs leading-relaxed text-emerald-700">
              <span className="font-semibold">应对：</span>
              {scam.counterMeasure}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================
   主组件
   ============================================ */
export default function UsedCheckPage() {
  const [description, setDescription] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const { object, submit, isLoading, error, stop } = experimental_useObject({
    api: `${process.env.NEXT_PUBLIC_WORKER_URL || 'https://wq.abrdns.eu.cc'}/api/search`,
    schema: LLMResponseSchema,
  });

  const resultsRef = useRef<HTMLDivElement>(null);
  const hasResult = object?.intent === 'used_market';

  useEffect(() => {
    if (hasResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasResult]);

  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed || trimmed.length < 4) return;

    const prompt = `【二手防坑鉴定模式】以下是用户在二手交易中关注的商品，请你：

1. 识别该商品在二手市场中常见的骗局话术和套路，逐一拆解并给出应对措施
2. 给出整体风险等级：极高 / 中等 / 低
3. 生成一份保姆级的线下验机步骤清单，按验机顺序排列，每条包含步骤名称和操作细节

用户关注的商品："${trimmed}"

请使用 intent='used_market' 模式输出结果。`;

    submit({ query: prompt });
    setSubmittedQuery(trimmed);
  };

  const renderResult = () => {
    const data = object as UsedMarketResult | undefined;
    if (!data || data.intent !== 'used_market') return null;

    const riskStyle = RISK_STYLES[data.riskLevel] ?? RISK_STYLES['中等'];
    const checklist = data.inspectionChecklist ?? [];
    const scams = data.scamRoutines ?? [];

    return (
      <div ref={resultsRef} className="space-y-6 animate-fade-in-up">
        {/* ===== 风险概览卡片 ===== */}
        <div className={`rounded-2xl border-2 ${riskStyle.ring} ${riskStyle.bg} p-6 shadow-sm`}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xl">{riskStyle.icon}</span>
            <div>
              <p className={`text-sm font-bold ${riskStyle.text}`}>
                {data.productName ?? '该商品'}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                整体风险：{data.riskLevel}
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{data.riskSummary}</p>
        </div>

        {/* ===== 骗局话术 ===== */}
        <ScamCards routines={scams} />

        {/* ===== 验机清单 ===== */}
        <InspectionChecklist items={checklist} />
      </div>
    );
  };

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-16">
      {/* ===== 页面标题区 ===== */}
      <section className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-3xl shadow-sm ring-1 ring-blue-100">
          🛡️
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">二手防坑鉴定</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          输入想淘的二手商品，AI 拆解交易风险 + 生成验机清单
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          线下验机时打开此页面，一边检查一边打钩确认
        </p>
        <div className="mx-auto mt-4 w-10 border-t-2 border-blue-400" />
      </section>

      {/* ===== 输入区 ===== */}
      <div className="w-full max-w-2xl">
        <div className="card-input overflow-hidden p-0">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              hasResult
                ? '试试鉴定其他二手商品？'
                : '输入你想淘的二手商品型号...\n\n例如：\n- 闲鱼上想买 iPhone 15 Pro，怎么避坑？\n- 二手相机索尼 A7M4，验机要检查什么？\n- 想淘一辆二手九号 E100，怕买到翻新车'
            }
            rows={hasResult ? 3 : 5}
            maxLength={300}
            className="w-full resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-slate-900 placeholder-slate-400 outline-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between border-t border-slate-50 bg-slate-50/50 px-4 py-2.5">
            <span className="text-xs text-slate-400">
              {description.length}/300 · Ctrl+Enter 发送
            </span>
            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-red-300 hover:text-red-500"
                >
                  停止
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || description.trim().length < 4}
                className="rounded-lg bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    鉴定中...
                  </span>
                ) : (
                  '开始鉴定'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 提示示例 ===== */}
      {!hasResult && !isLoading && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            '闲鱼 iPhone 15 Pro 验机',
            '二手相机索尼 A7M4',
            '电动车九号 E100',
            '二手显卡 RTX 4099',
            '二手积家手表鉴定',
            'AirPods Pro 真伪鉴别',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setDescription(suggestion)}
              className="rounded-full border border-slate-100 bg-white px-3 py-1 text-xs text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* ===== 错误提示 ===== */}
      {error && !hasResult && (
        <div className="mt-8 w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-sm font-semibold text-red-700">鉴定失败</p>
          <p className="mt-1 text-xs text-red-500">{error.message || '未知错误，请稍后重试'}</p>
          <button
            type="button"
            onClick={handleSubmit}
            className="mt-3 rounded-md bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
          >
            重新鉴定
          </button>
        </div>
      )}

      {/* ===== 结果区 ===== */}
      <div className="mt-8 w-full max-w-4xl">
        {isLoading && !hasResult && <SkeletonLoader />}
        {!isLoading && !hasResult && !error && !submittedQuery && <EmptyState />}
        {isLoading && hasResult && <ProgressBar active />}
        {renderResult()}
      </div>

      {/* 底部导航 */}
      <div className="mt-12 mb-8 flex items-center gap-4">
        <Link href="/" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          ← 返回单品检测
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/compare" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          1v1 对比
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/blacklist" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          智商税黑榜
        </Link>
        <span className="text-slate-200">|</span>
        <Link href="/clinic" className="text-xs font-medium text-slate-400 transition-colors hover:text-blue-500">
          选品诊所
        </Link>
      </div>

      <p className="mb-8 text-center text-xs font-medium text-slate-300">
        本实验室独立运营，分析结果仅供参考，交易决策请自行判断。
      </p>
    </main>
  );
}
