'use client';

// ============================================
// 数据溯源小面板
// 显示在评分仪表盘旁，呈现分析所用参考数据的来源与规模
// ============================================

interface SourceStatsPanelProps {
  sampleSize: number;
  platforms: string[];
}

/** 平台 → 图标缩写 */
const platformIcons: Record<string, string> = {
  京东: 'JD',
  淘宝: 'TB',
  天猫: 'TM',
  拼多多: 'PDD',
  小红书: '📕',
  B站: 'B',
  什么值得买: 'SMZ',
  抖音: 'DY',
  快手: 'KS',
  知乎: 'ZH',
  微博: 'WB',
};

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function SourceStatsPanel({ sampleSize, platforms }: SourceStatsPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-5">
      {/* 标题行 */}
      <div className="mb-3 flex items-center gap-2">
        <svg
          className="h-4 w-4 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
          />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          数据溯源
        </span>
      </div>

      {/* 评价样本数 */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-800">
          {formatNumber(sampleSize)}
        </span>
        <span className="text-xs text-gray-400">条参考评价</span>
      </div>

      {/* 来源平台标签 */}
      <div className="flex flex-wrap gap-1.5">
        {platforms.map((p) => {
          const icon = platformIcons[p] ?? p.slice(0, 2);
          return (
            <span
              key={p}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600"
            >
              <span className="font-mono font-semibold text-gray-400">
                {icon}
              </span>
              {p}
            </span>
          );
        })}
      </div>

      <p className="mt-3 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-400">
        数据规模为 AI 基于知识库估算，实际分析可能覆盖更多来源。仅供参考。
      </p>
    </div>
  );
}
