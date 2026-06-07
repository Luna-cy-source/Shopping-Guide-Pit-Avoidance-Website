'use client';

import recallData from '../lib/data/recall_summary.json';

interface RecallSummary {
  totalRecords: number;
  hazardDistribution: { name: string; count: number; pct: number }[];
}

// 品类 → 相关风险映射
const CATEGORY_RISK_MAP: Record<string, string[]> = {
  '家电': ['火灾/烧伤', '触电/电击'],
  '电子产品': ['火灾/烧伤', '触电/电击'],
  '家具': ['跌落/翻倒', '火灾/烧伤'],
  '玩具': ['窒息风险', '中毒/化学风险'],
  '工具': ['割伤/划伤', '交通事故/撞击'],
  '母婴': ['窒息风险', '跌落/翻倒'],
  '运动': ['交通事故/撞击', '跌落/翻倒'],
  '汽车': ['交通事故/撞击', '火灾/烧伤'],
  '食品': ['中毒/化学风险'],
  '化妆品': ['中毒/化学风险'],
  '服装': ['火灾/烧伤'],
};

interface Props {
  /** AI 返回的品类字段 */
  category?: string;
  /** AI 返回的坑点列表 */
  flaws?: { title: string }[];
}

export default function DatasetInsight({ category, flaws }: Props) {
  // 直接使用静态 JSON 数据
  const recall = recallData as RecallSummary;

  // 根据品类匹配相关风险
  const matchedRisks: { name: string; count: number; pct: number }[] = [];
  if (category) {
    for (const [key, risks] of Object.entries(CATEGORY_RISK_MAP)) {
      if (category.includes(key)) {
        for (const risk of risks) {
          const found = recall.hazardDistribution.find((h) => h.name === risk);
          if (found) matchedRisks.push(found);
        }
        break;
      }
    }
  }

  // 取前 3 大风险作为通用展示
  const topRisks = recall.hazardDistribution.slice(0, 3);

  // AI 坑点与数据集风险的交叉提示
  const flawTitles = (flaws || []).map((f) => f.title).join('、').toLowerCase();
  const crossMatches: string[] = [];
  if (flawTitles.includes('发热') || flawTitles.includes('过热') || flawTitles.includes('温度')) {
    crossMatches.push('🔥 与此相关的火灾/烧伤风险在召回数据中占比最高（28.7%）');
  }
  if (flawTitles.includes('安全') || flawTitles.includes('危险') || flawTitles.includes('隐患')) {
    crossMatches.push('⚠️ 该品类在 CPSC 公开数据中存在大量安全相关召回记录');
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-white p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-base">📊</span>
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-slate-700 mb-1">
            数据集交叉验证
            <span className="ml-2 font-normal text-[10px] text-slate-400">来自 GitHub 公开 CPSC 数据</span>
          </h4>

          {/* 品类匹配时：显示相关风险 */}
          {matchedRisks.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500">
                该品类「{category}」在 {recall.totalRecords.toLocaleString()} 条产品召回记录中，相关风险分布如下：
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchedRisks.map((r) => (
                  <span
                    key={r.name}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-100"
                  >
                    {r.name} {r.pct}%
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500">
                基于 {recall.totalRecords.toLocaleString()} 条产品召回公开数据，消费品最常见的风险类型：
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topRisks.map((r) => (
                  <span
                    key={r.name}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-100"
                  >
                    {r.name} {r.pct}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI 坑点与数据交叉提示 */}
          {crossMatches.length > 0 && (
            <div className="mt-2 space-y-1">
              {crossMatches.map((msg, i) => (
                <p key={i} className="text-[10px] text-amber-600 bg-amber-50/50 rounded px-2 py-1">
                  {msg}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
