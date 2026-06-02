'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BlacklistItem {
  id: number;
  productName: string;
  score: number;
  fatalFlaw: string;
  tags: string[];
  date: string;
  status?: 'problem' | 'fixed' | 'removed';
  statusNote?: string;
}

type ProductStatus = 'problem' | 'fixed' | 'removed';

const STATUS_CONFIG: Record<ProductStatus, { label: string; emoji: string; bg: string; text: string; desc: string }> = {
  problem: { label: '问题中', emoji: '⚠️', bg: 'bg-red-50', text: 'text-red-600', desc: '该商品仍存在争议' },
  fixed:   { label: '已整改', emoji: '✅', bg: 'bg-emerald-50', text: 'text-emerald-600', desc: '品牌方已改善' },
  removed: { label: '已下架', emoji: '🚫', bg: 'bg-slate-100', text: 'text-slate-500', desc: '已从主流平台下架' },
};

export default function BlacklistPage() {
  const router = useRouter();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [statusMap, setStatusMap] = useState<Record<number, ProductStatus>>({});
  const [statusNoteModal, setStatusNoteModal] = useState<{ id: number; status: ProductStatus } | null>(null);

  const handleReset = () => {
    const reset: Record<number, ProductStatus> = {};
    items.forEach((item) => { reset[item.id] = 'problem'; });
    setStatusMap(reset);
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchBlacklist() {
      try {
        const resp = await fetch('/api/blacklist');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const data = await resp.json();
        if (!cancelled) {
          const fetchedItems: BlacklistItem[] = data.items || [];
          setItems(fetchedItems);
          const init: Record<number, ProductStatus> = {};
          fetchedItems.forEach((item) => { init[item.id] = 'problem'; });
          setStatusMap(init);
          setLastUpdated(data.updatedAt || new Date().toISOString());
        }
      } catch {
        if (!cancelled) {
          const fb: BlacklistItem[] = [
            { id: 1, productName: 'Test Product A', score: 12, fatalFlaw: 'Test flaw description here', tags: ['tag1', 'tag2'], date: '2026-05' },
            { id: 2, productName: 'Test Product B', score: 18, fatalFlaw: 'Another test flaw', tags: ['tag3'], date: '2026-05' },
          ];
          setItems(fb);
          const init2: Record<number, ProductStatus> = {};
          fb.forEach((item) => { init2[item.id] = 'problem'; });
          setStatusMap(init2);
          setLastUpdated(new Date().toISOString());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBlacklist();
    return () => { cancelled = true; };
  }, []);

  const avgScore = items.length > 0 ? (items.reduce((s, i) => s + i.score, 0) / items.length).toFixed(1) : '--';
  const riskTags = items.flatMap(i => i.tags || []);
  const uniqueTagCount = new Set(riskTags).size;

  return (
    <div className="relative z-[1] flex min-h-[80vh] flex-col items-center px-4 pt-20 pb-16">
      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-4xl shadow-[0_8px_30px_rgb(239,68,68,0.08)] ring-1 ring-red-10">
        📊
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-90">
        智商税黑榜
      </h1>
      <p className="mb-2 max-w-md text-center text-sm leading-relaxed font-medium text-slate-500">
        基于真实用户踩坑数据，实时更新
      </p>
      <div className="mx-auto w-12 border-t-2 border-red-400" />

      {!loading && !error && items.length > 0 && (
        <div className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-3">
          <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-red-500">{items.length}</p>
            <p className="mt-0.5 text-[11px] font-medium text-red-400">本月上榜</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{avgScore}</p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-400">平均分</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-slate-600">{uniqueTagCount}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">标签数</p>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-3 flex justify-end w-full max-w-2xl">
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-red-300 hover:text-red-500 active:scale-[0.98]">
            重置状态
          </button>
        </div>
      )}

      {loading && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
          <p className="text-sm font-medium text-slate-400">加载中...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card-premium mt-10 flex w-full max-w-2xl flex-col items-center gap-2 p-8 text-center">
          <p className="text-sm font-bold text-red-500">加载失败</p>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="card-premium mt-10 flex w-full max-w-2xl flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-bold text-slate-500">暂无数据</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-8 flex w-full max-w-2xl flex-col gap-5">
          {items.map((item, idx) => (
            <article key={item.id} className="card-premium-interactive shimmer group relative overflow-hidden p-0" style={{ animationDelay: `${idx * 80}ms` }}>
              {idx === 0 && (
                <div className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-3xl bg-gradient-to-br from-red-500 to-rose-500 text-sm font-bold text-white shadow-md">
                  &#129351;
                </div>
              )}
              {idx > 0 && (
                <div className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-3xl bg-red-500 text-sm font-bold text-white shadow-sm">
                  {idx + 1}
                </div>
              )}
              <div className="p-6 pr-14 sm:p-7 sm:pr-16">
                <div className="mb-4 flex flex-wrap items-baseline gap-2.5">
                  <button type="button" onClick={() => router.push(`/report?q=${encodeURIComponent(item.productName)}`)} className="text-left text-base font-bold text-slate-900 transition-colors hover:text-red-600 sm:text-lg">
                    {item.productName}
                    <span className="ml-1 text-xs font-normal text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"> &rarr; </span>
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-100">
                    避坑指数 <span className="ml-0.5 text-base font-extrabold text-red-500">{item.score}</span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">极度避坑</span>

                  {(() => {
                    const s = statusMap[item.id] ?? 'problem';
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button type="button" onClick={() => setStatusNoteModal({ id: item.id, status: s })} title="点击查看详情" className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all hover:shadow-sm ${cfg.bg} ${cfg.text}`}>
                        <span>{cfg.emoji}</span>{cfg.label}
                      </button>
                    );
                  })()}
                </div>

                <div className="relative mb-4 rounded-xl border-l-[3px] border-red-500 bg-red-50 px-4 py-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">&#128269; 致命槽点</div>
                  <p className="text-sm leading-relaxed font-medium text-red-800">{item.fatalFlaw}</p>
                </div>

                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-400">避坑指数（满分 100）</span>
                    <span className="font-bold text-red-500">{item.score}/100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-700" style={{ width: `${item.score}%` }} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(item.tags || []).map((tag) => (
                      <span key={tag} className="inline-block rounded-lg border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-600">{tag}</span>
                    ))}
                  </div>
                  <time className="text-xs font-medium text-slate-400">{item.date}</time>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-50 pt-3">
                  <span className="text-[10px] text-slate-400">更新状态：</span>
                  {(['problem', 'fixed', 'removed'] as ProductStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = (statusMap[item.id] ?? 'problem') === s;
                    return (
                      <button key={s} type="button" onClick={() => setStatusMap((prev) => ({ ...prev, [item.id]: s }))} className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${isActive ? `${cfg.bg} ${cfg.text} ring-1 ring-offset-1` : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'}`}>
                        {cfg.emoji} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}

          <p className="mt-2 text-center text-[11px] font-medium leading-relaxed text-slate-400">
            本榜单由 AI 实验室生成
          </p>
        </div>
      )}

      <Link href="/" className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-red-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        返回
      </Link>

      {statusNoteModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setStatusNoteModal(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg">{STATUS_CONFIG[statusNoteModal.status].emoji}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{STATUS_CONFIG[statusNoteModal.status].label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{STATUS_CONFIG[statusNoteModal.status].desc}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setStatusNoteModal(null)} className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50">关闭</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
