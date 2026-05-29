'use client';

import type { PriceReference } from '../lib/schema';

// ============================================
// 平台颜色映射
// ============================================
const PLATFORM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  京东: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  淘宝: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  拼多多: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  抖音: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-200' },
  苏宁: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
};

// ============================================
// 排序：按价格从低到高
// ============================================
function sortByPrice(list: PriceReference[]): PriceReference[] {
  return [...list].sort((a, b) => a.price - b.price);
}

// ============================================
// 全网参考底价卡片
// ============================================
interface Props {
  items: PriceReference[];
}

export default function PriceReferenceCard({ items }: Props) {
  if (!items || items.length === 0) return null;

  const sorted = sortByPrice(items);
  const best = sorted[0];

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-6">
      {/* 标题 */}
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
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
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
        全网参考底价
        <span className="rounded-full bg-amber-100 px-2 text-xs font-normal text-amber-600">
          预估·仅供参考
        </span>
      </h3>

      {/* 最优价高亮条 */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-amber-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
        <div>
          <p className="text-xs text-amber-600">预估最低到手价</p>
          <p className="text-lg font-bold text-amber-700">
            ¥{best.price.toLocaleString()}
            <span className="ml-2 text-xs font-medium text-amber-500">
              {best.platform}
            </span>
          </p>
        </div>
      </div>

      {/* 各平台价格列表 */}
      <div className="grid gap-2 sm:grid-cols-2">
        {sorted.map((item, i) => {
          const color = PLATFORM_COLORS[item.platform] ?? PLATFORM_COLORS['京东'];
          const isBest = item.price === best.price && item.platform === best.platform;

          return (
            <div
              key={i}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-shadow hover:shadow-sm ${
                isBest ? `${color.border} ${color.bg}` : 'border-gray-100'
              }`}
            >
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color.bg} ${color.text}`}
              >
                {item.platform}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${color.text}`}>
                  ¥{item.price.toLocaleString()}
                </span>
                {isBest && (
                  <span className="rounded bg-amber-200 px-1 py-0.5 text-[10px] font-bold text-amber-700">
                    最低
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 免责声明 */}
      <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-300">
        价格基于 AI 知识库预估，波动频繁，仅供参考。实际价格请以各平台下单页为准。
      </p>
    </section>
  );
}
