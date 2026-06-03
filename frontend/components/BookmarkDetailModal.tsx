'use client';

import { type BookmarkItem, type BookmarkType } from '../hooks/useBookmarks';

/* ============================================
   BookmarkDetailModal — 收藏详情弹窗
   点击收藏项时，如果有缓存数据则直接展示
   无缓存时降级为跳转原页面
   ============================================ */

interface Props {
  bookmark: BookmarkItem;
  onClose: () => void;
  onNavigate?: (url: string) => void;  // 无数据时的降级跳转
}

export default function BookmarkDetailModal({ bookmark, onClose, onNavigate }: Props) {
  const { reportData, type, productName } = bookmark;

  // 没有缓存数据 → 降级跳转
  if (!reportData && onNavigate) {
    if (type === 'clinic') {
      const q = productName.replace(/^选品推荐:\s*/, '');
      onNavigate(`/clinic?q=${encodeURIComponent(q)}`);
    } else {
      onNavigate(bookmark.url);
    }
    return null;
  }

  const TYPE_CONFIG: Record<BookmarkType, { icon: string; color: string; title: string }> = {
    report:     { icon: '📋', color: 'text-red-600', title: '避坑报告' },
    used_check: { icon: '🛡️', color: 'text-blue-600', title: '二手防坑鉴定' },
    clinic:     { icon: '💡', color: 'text-purple-600', title: '选品推荐方案' },
  };

  const cfg = TYPE_CONFIG[type];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 弹窗 */}
      <div
        className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">{cfg.icon}</span>
            <h3 className={`text-base font-bold truncate ${cfg.color}`}>{cfg.title}</h3>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">已收藏</span>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* 内容区（可滚动） */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {type === 'report' ? (
            <ReportContent data={reportData} />
          ) : type === 'used_check' ? (
            <UsedCheckContent data={reportData} />
          ) : (
            <ClinicContent data={reportData} />
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-slate-100 px-5 py-3 shrink-0 flex justify-end gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            查看完整报告 →
          </a>
        </div>
      </div>
    </div>
  );
}

/* ========== 避坑报告内容渲染 ========== */
function ReportContent({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <EmptyState msg="暂无缓存的报告数据" />;
  }

  const score = typeof data.score === 'number' ? data.score : '--';
  const name = data.productName || '未知商品';
  const price = data.priceAnalysis || data.overview || '';
  const flaws = Array.isArray(data.flaws) ? data.flaws : [];

  return (
    <>
      {/* 商品名 + 评分 */}
      <div>
        <h4 className="text-base font-bold text-slate-900 mb-1">{name}</h4>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-baseline rounded-full px-3 py-1 text-lg font-black ${
            score >= 7 ? 'bg-emerald-50 text-emerald-600' : score >= 4 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
          }`}>{score}<span className="text-xs font-normal ml-0.5">/10</span></span>
          <span className="text-xs text-slate-400">
            {score >= 7 ? '推荐入手' : score >= 4 ? '谨慎考虑' : '建议避坑'}
          </span>
        </div>
      </div>

      {/* 价格/概述 */}
      {price && (
        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{price}</p>
        </div>
      )}

      {/* 避坑点 */}
      {flaws.length > 0 && (
        <div>
          <h5 className="flex items-center gap-1.5 text-xs font-bold text-red-500 mb-2">
            ⚠️ 避坑要点 ({flaws.length})
          </h5>
          <div className="space-y-2">
            {flaws.slice(0, 8).map((f: any, i: number) => (
              <div key={i} className="rounded-lg border border-red-50 bg-red-50/60 p-3">
                <p className="text-xs font-semibold text-red-700 mb-0.5">{f.title}</p>
                {(f.analysis || f.detail || f.description) && (
                  <p className="text-[11px] leading-relaxed text-red-600/80">{f.analysis || f.detail || f.description}</p>
                )}
                {f.quote && (
                  <p className="text-[11px] leading-relaxed text-slate-500 mt-1 italic">「{f.quote}」</p>
                )}
              </div>
            ))}
            {flaws.length > 8 && <p className="text-[10px] text-slate-400 text-center">... 还有 {flaws.length - 8} 条避坑点</p>}
          </div>
        </div>
      )}

      {/* 数据来源 */}
      {(data.sourceCount || data.sourceStats) && (
        <div className="rounded-lg bg-blue-50/50 px-3 py-2 text-[10px] text-blue-600">
          📊 数据来源：{data.sourceCount || Object.keys(data.sourceStats || {}).length || 'AI 分析'} 条参考评价
        </div>
      )}
    </>
  );
}

/* ========== 二手防坑内容渲染 ========== */
function UsedCheckContent({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <EmptyState msg="暂无缓存的鉴定数据" />;
  }

  const name = data.productName || '未知商品';
  const level = data.riskLevel || '未知';
  const summary = data.riskSummary || '';
  const routines = Array.isArray(data.scamRoutines) ? data.scamRoutines : [];
  const checklist = Array.isArray(data.inspectionChecklist) ? data.inspectionChecklist : [];

  const RISK_MAP: Record<string, { bg: string; text: string; icon: string }> = {
    '极高': { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' },
    '中等': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡' },
    '低':   { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢' },
  };
  const riskStyle = RISK_MAP[level] || RISK_MAP['中等'];

  return (
    <>
      <div>
        <h4 className="text-base font-bold text-slate-900">{name}</h4>
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${riskStyle.bg}">
          <span>{riskStyle.icon}</span>
          <span className={`text-xs font-bold ${riskStyle.text}`}>整体风险：{level}</span>
        </div>
      </div>

      {summary && (
        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
        </div>
      )}

      {checklist.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-slate-600 mb-2">📋 验机清单 ({checklist.length} 项)</h5>
          <div className="space-y-1.5">
            {checklist.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-2 rounded-lg bg-white border border-slate-100 p-2.5">
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="text-xs font-medium text-slate-800">{item.step}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {routines.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-red-500 mb-2">🎭 常见骗局话术 ({routines.length})</h5>
          <div className="space-y-2">
            {routines.slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                <p className="text-xs font-bold text-red-700 mb-1">{s.title}</p>
                <p className="text-[11px] text-red-600/80"><b>套路：</b>{s.routine}</p>
                <p className="text-[11px] text-emerald-600 mt-1"><b>应对：</b>{s.counterMeasure}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* ========== 选品推荐内容渲染 ========== */
function ClinicContent({ data }: { data: any }) {
  if (!data || typeof data !== 'object') {
    return <EmptyState msg="暂存无缓存的推荐数据" />;
  }

  const profile = data.userProfile || '';
  const recs = Array.isArray(data.recommendations) ? data.recommendations : [];

  function scoreColor(score: number): string {
    if (score < 4) return 'text-red-600';
    if (score < 7) return 'text-amber-600';
    return 'text-emerald-600';
  }
  function scoreBg(score: number): string {
    if (score < 4) return 'bg-red-50';
    if (score < 7) return 'bg-amber-50';
    return 'bg-emerald-50';
  }

  return (
    <>
      {profile && (
        <div className="rounded-xl bg-purple-50 p-3.5">
          <p className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold mb-1">👤 用户画像</p>
          <p className="text-xs text-purple-800 leading-relaxed">{profile}</p>
        </div>
      )}

      {recs.length > 0 ? (
        <div className="space-y-3">
          {recs.map((rec: any, i: number) => {
            const s = typeof rec.score === 'number' ? rec.score : 5;
            return (
              <div key={i} className={`rounded-xl border ${scoreBg(s)} p-3.5`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-white text-[10px] font-bold flex items-center justify-center text-slate-600 shadow-sm">{i + 1}</span>
                      <h5 className="text-sm font-bold text-slate-900 truncate">{rec.productName}</h5>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-sm font-black ${scoreBg(s)} ${scoreColor(s)}`}>{s}</span>
                </div>
                {rec.priceRange && (
                  <p className="text-[11px] text-slate-500 mb-1.5 ml-7">💰 {rec.priceRange}</p>
                )}
                {rec.reason && (
                  <div className="ml-7 rounded-lg bg-white/70 p-2 mb-1.5">
                    <p className="text-[11px] text-emerald-700 leading-relaxed"><b>✅ 推荐理由：</b>{rec.reason}</p>
                  </div>
                )}
                {rec.compromise && (
                  <div className="ml-7 rounded-lg bg-white/70 p-2">
                    <p className="text-[11px] text-amber-700 leading-relaxed"><b>⚠️ 妥协点：</b>{rec.compromise}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState msg="推荐列表为空" />
      )}
    </>
  );
}

/* ========== 空状态 ========== */
function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="mb-2 text-3xl opacity-30">📭</span>
      <p className="text-xs text-slate-400">{msg}</p>
      <p className="mt-1 text-[10px] text-slate-300">点击下方按钮查看完整报告</p>
    </div>
  );
}
