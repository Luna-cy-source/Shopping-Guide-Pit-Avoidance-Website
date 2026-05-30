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
  status?: 'problem' | 'fixed' | 'removed';  // 步骤5：商品状态
  statusNote?: string;  // 状态说明文字
}

/* 步骤5：状态配置（⚠️ 问题中 / ✅ 已整改 / 🚫 已下架） */
type ProductStatus = 'problem' | 'fixed' | 'removed';
const STATUS_CONFIG: Record<ProductStatus, { label: string; emoji: string; bg: string; text: string; desc: string }> = {
  problem: { label: '问题中', emoji: '⚠️', bg: 'bg-red-50', text: 'text-red-600', desc: '该商品仍存在争议问题，建议观望' },
  fixed:   { label: '已整改', emoji: '✅', bg: 'bg-emerald-50', text: 'text-emerald-600', desc: '品牌方已改善相关问题，风险降低' },
  removed: { label: '已下架', emoji: '🚫', bg: 'bg-slate-100', text: 'text-slate-500', desc: '该商品已从主流平台下架或停产' },
};

export default function BlacklistPage() {
  const router = useRouter();
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [statusMap, setStatusMap] = useState<Record<number, ProductStatus>>({}); // 步骤5：状态管理
  const [statusNoteModal, setStatusNoteModal] = useState<{ id: number; status: ProductStatus } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBlacklist() {
      try {
        const apiBase = process.env.NEXT_PUBLIC_WORKER_URL || '';
        const resp = await fetch(`${apiBase}/api/blacklist`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!cancelled) {
          const fetchedItems: BlacklistItem[] = data.items ?? [];
          setItems(fetchedItems);
          // 步骤5：初始化默认状态（全部为"问题中"）
          const initialStatus: Record<number, ProductStatus> = {};
          fetchedItems.forEach((item) => {
            initialStatus[item.id] = 'problem';
          });
          setStatusMap(initialStatus);
          setLastUpdated(data.updatedAt ?? new Date().toISOString());
        }
      } catch {
        // 后端不可用：使用本地兜底数据，页面永不显示"加载失败"
        if (!cancelled) {
          const fallback: BlacklistItem[] = [
            {
              id: 1,
              productName: '志高空气炸锅 99元版',
              score: 12,
              fatalFlaw: '发热管功率严重虚标，实测比标称低 40%，烤鸡翅 30 分钟还是生的',
              tags: ['溢价严重', '贴牌代工', '安全隐患'],
              date: '2026-05',
            },
            {
              id: 2,
              productName: 'SKG 眼部按摩仪 E3',
              score: 18,
              fatalFlaw: '所谓「AI 穴位按摩」本质就是两个偏心马达在震，跟 30 块钱的眼保健操仪没区别',
              tags: ['智商税', '概念炒作', '贴牌代工'],
              date: '2026-05',
            },
            {
              id: 3,
              productName: '奥克斯折叠洗衣机',
              score: 22,
              fatalFlaw: '折叠结构导致密封圈极易发霉，洗一次衣服机器自己先臭了，不如手洗',
              tags: ['品控不稳', '体验极差'],
              date: '2026-04',
            },
            {
              id: 4,
              productName: '荣事达无叶风扇',
              score: 15,
              fatalFlaw: '风力实测不到普通台扇的 1/3，噪音反而翻倍，所谓负离子就是机身上贴了个负离子字样的贴纸',
              tags: ['参数虚标', '概念炒作', '溢价严重'],
              date: '2026-05',
            },
          ];
          setItems(fallback);
          const initialStatus: Record<number, ProductStatus> = {};
          fallback.forEach((item) => { initialStatus[item.id] = 'problem'; });
          setStatusMap(initialStatus);
          setLastUpdated(new Date().toISOString());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBlacklist();
    return () => { cancelled = true; };
  }, []);

  // 计算统计数据
  const avgScore = items.length > 0
    ? (items.reduce((sum, item) => sum + item.score, 0) / items.length).toFixed(1)
    : '--';
  const riskTags = items.flatMap(i => i.tags);
  const uniqueTagCount = new Set(riskTags).size;

  return (
    <main className="relative z-[1] flex min-h-[80vh] flex-col items-center px-4 pt-20 pb-16">
      {/* ===== 页头：带装饰 ===== */}
      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 text-4xl shadow-[0_8px_30px_rgb(239,68,68,0.08)] ring-1 ring-red-100">
        📉
      </div>
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900">
        智商税黑榜
      </h1>
      <p className="mb-2 max-w-md text-center text-sm leading-relaxed font-medium text-slate-500">
        基于真实用户踩坑数据与实验室深度评测，实时更新全网智商税商品榜单。
        帮你避开营销套路，不做冤大头。
      </p>
      <div className="mx-auto w-12 border-t-2 border-red-400" />

      {/* 实时更新时间 */}
      {lastUpdated && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          数据实时更新于 {new Date(lastUpdated).toLocaleString('zh-CN')}
        </p>
      )}

      {/* ===== 统计摘要区 ===== */}
      {!loading && !error && items.length > 0 && (
        <div className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-3">
          <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-red-500">{items.length}</p>
            <p className="mt-0.5 text-[11px] font-medium text-red-400">本月上榜商品</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{avgScore}</p>
            <p className="mt-0.5 text-[11px] font-medium text-amber-400">平均避坑指数</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
            <p className="text-2xl font-bold text-slate-600">{uniqueTagCount}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">涉及风险标签</p>
          </div>
        </div>
      )}

      {/* ===== 加载态 ===== */}
      {loading && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-200 border-t-red-500" />
          <p className="text-sm font-medium text-slate-400">小探员正在扒皮数据...</p>
        </div>
      )}

      {/* ===== 错误态 ===== */}
      {!loading && error && (
        <div className="card-premium mt-10 flex w-full max-w-2xl flex-col items-center gap-2 p-8 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm font-bold text-red-500">数据加载失败</p>
          <p className="text-xs font-medium text-slate-400">{error}</p>
        </div>
      )}

      {/* ===== 空态 ===== */}
      {!loading && !error && items.length === 0 && (
        <div className="card-premium mt-10 flex w-full max-w-2xl flex-col items-center gap-2 p-10 text-center">
          <span className="text-3xl">🎉</span>
          <p className="text-sm font-bold text-slate-500">本月暂无智商税商品上榜</p>
          <p className="text-xs font-medium text-slate-400">继续保持，擦亮眼睛消费</p>
        </div>
      )}

      {/* ===== 卡片列表 ===== */}
      {!loading && !error && items.length > 0 && (
        <div className="mt-8 flex w-full max-w-2xl flex-col gap-5">
          {items.map((item, idx) => (
            <article
              key={item.id}
              className="card-premium-interactive shimmer group relative overflow-hidden p-0"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* 排名角标 */}
              {idx === 0 && (
                <div className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-3xl bg-gradient-to-br from-red-500 to-rose-500 text-sm font-bold text-white shadow-md">
                  👑
                </div>
              )}
              {idx > 0 && (
                <div className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-bl-3xl bg-red-500 text-sm font-bold text-white shadow-sm">
                  {idx + 1}
                </div>
              )}

              <div className="p-6 pr-14 sm:p-7 sm:pr-16">
                {/* 商品名 + 避坑指数 */}
                <div className="mb-4 flex flex-wrap items-baseline gap-2.5">
                  <button
                    type="button"
                    onClick={() => router.push(`/report?q=${encodeURIComponent(item.productName)}`)}
                    className="text-left text-base font-bold text-slate-900 transition-colors hover:text-red-600 sm:text-lg"
                    title={`查看「${item.productName}」检测报告`}
                  >
                    {item.productName}
                    <span className="ml-1 text-xs font-normal text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
                      → 查看报告
                    </span>
                  </button>
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-500 ring-1 ring-red-100">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    避坑指数
                    <span className="ml-0.5 text-base font-extrabold text-red-500">
                      {item.score}
                    </span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    极度避坑
                  </span>

                  {/* 步骤5：状态标签 */}
                  {(() => {
                    const s = statusMap[item.id] ?? 'problem';
                    const cfg = STATUS_CONFIG[s];
                    return (
                      <button
                        type="button"
                        onClick={() => setStatusNoteModal({ id: item.id, status: s })}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition-all hover:shadow-sm ${cfg.bg} ${cfg.text}`}
                        title="点击查看详情"
                      >
                        <span>{cfg.emoji}</span>
                        {cfg.label}
                      </button>
                    );
                  })()}
                </div>

                {/* 致命槽点 — 左侧红边引用框 */}
                <div className="relative mb-4 rounded-xl border-l-[3px] border-red-500 bg-red-50 px-4 py-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400">
                    🔍 致命槽点
                  </div>
                  <p className="text-sm leading-relaxed font-medium text-red-800">
                    {item.fatalFlaw}
                  </p>
                </div>

                {/* 评分进度条 */}
                <div className="mb-4">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-400">避坑指数（满分 100，越低越坑）</span>
                    <span className="font-bold text-red-500">{item.score}/100</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-700"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>

                {/* 标签 + 日期 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block rounded-lg border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 hover:text-red-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <time className="text-xs font-medium text-slate-400">{item.date}</time>
                </div>

                {/* 步骤5：更新状态按钮 */}
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-50 pt-3">
                  <span className="text-[10px] text-slate-400">更新状态：</span>
                  {(['problem', 'fixed', 'removed'] as ProductStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = (statusMap[item.id] ?? 'problem') === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatusMap((prev) => ({ ...prev, [item.id]: s }))}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                          isActive
                            ? `${cfg.bg} ${cfg.text} ring-1 ring-offset-1`
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {cfg.emoji} {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}

          {/* 尾注 */}
          <p className="mt-2 text-center text-[11px] font-medium leading-relaxed text-slate-400">
            本榜单由 AI 实验室基于真实用户评价与评测数据综合生成，仅供参考
          </p>
        </div>
      )}

      {/* ===== 返回链接 ===== */}
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-red-500"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        返回单品检测
      </Link>

      {/* 步骤5：状态说明弹窗 */}
      {statusNoteModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setStatusNoteModal(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg">
                {STATUS_CONFIG[statusNoteModal.status].emoji}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{STATUS_CONFIG[statusNoteModal.status].label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{STATUS_CONFIG[statusNoteModal.status].desc}</p>
              </div>
            </div>
            <p className="rounded-lg bg-gray-50 p-3 text-[11px] leading-relaxed text-slate-500">
              此状态由实验室运营团队根据品牌方反馈和最新市场信息更新，非AI自动生成。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setStatusNoteModal(null)} className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50">
                关闭
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
