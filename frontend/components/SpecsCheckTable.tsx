'use client';

// ============================================
// 参数透视表格
// 揭露厂商宣称 vs 真实情况，体现「扒皮」感
// ============================================

interface SpecsCheckItem {
  specName: string;
  officialClaim: string;
  truth: string;
}

interface SpecsCheckTableProps {
  items: SpecsCheckItem[];
  isLoading?: boolean;
}

export default function SpecsCheckTable({ items, isLoading }: SpecsCheckTableProps) {
  if (!items || items.length === 0) return null;

  // 检查数据是否有效（所有字段都为空说明 AI 尚未返回完整内容）
  const hasEmptyData = items.every(
    (item) => (!item.officialClaim || item.officialClaim.trim() === '...') &&
                 (!item.truth || item.truth.trim() === '...')
  );

  return (
    <section className="space-y-3">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-amber-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-600">
          参数透视
        </h3>
        <span className="rounded-full bg-amber-50 px-2 text-xs font-normal text-amber-500">
          {items.length} 项参数
        </span>
        {hasEmptyData && isLoading && (
          <span className="rounded-full bg-blue-50 px-2 text-[10px] font-normal text-blue-500 animate-pulse">
            分析中...
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400">
        厂家宣传往往避重就轻。以下是对比厂商宣称与实际真相的「扒皮」清单：
      </p>

      {/* 数据尚未就绪时显示骨架屏 */}
      {hasEmptyData && isLoading ? (
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-white p-4">
          <div className="space-y-3">
            {items.map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-amber-100" />
                  <div className="h-4 w-28 rounded bg-gray-200" />
                </div>
                <div className="ml-7 flex gap-3">
                  <div className="h-12 flex-1 rounded-md bg-gray-100" />
                  <div className="h-12 flex-1 rounded-md bg-red-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : ( <>

      {/* 桌面表格 */}
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
        <table className="hidden min-w-full sm:table">
          <thead>
            <tr className="bg-amber-50/60">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-amber-700">
                参数项
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                厂商宣称
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-500">
                真实情况
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {items.map((item, i) => (
              <tr
                key={i}
                className="group transition-colors hover:bg-amber-50/30"
              >
                {/* 参数名 */}
                <td className="px-5 py-4 align-top">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-gray-800">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[10px] font-bold text-amber-700">
                      {i + 1}
                    </span>
                    {item.specName}
                  </span>
                </td>

                {/* 厂商宣称 — 浅灰底，带引号风格 */}
                <td className="px-5 py-4 align-top">
                  <div className="relative rounded-md bg-gray-100 px-3 py-2">
                    {/* 左三角箭头 */}
                    <div className="absolute -left-1.5 top-3 h-0 w-0 border-b-4 border-r-[6px] border-t-4 border-b-transparent border-r-gray-100 border-t-transparent" />
                    <p className="text-sm leading-relaxed text-gray-500">
                      {item.officialClaim || '...'}
                    </p>
                  </div>
                </td>

                {/* 真实情况 — 红色强调，扒皮风格 */}
                <td className="px-5 py-4 align-top">
                  <div className="relative rounded-md border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm leading-relaxed text-red-700">
                      <span className="mr-1 text-red-400">⚠</span>
                      {item.truth || '...'}
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 移动端卡片 */}
        <div className="space-y-0 sm:hidden">
          {items.map((item, i) => (
            <div
              key={i}
              className="border-b border-amber-100 p-4 last:border-b-0"
            >
              {/* 参数名 */}
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[10px] font-bold text-amber-700">
                  {i + 1}
                </span>
                <span className="font-semibold text-gray-800">
                  {item.specName}
                </span>
              </div>

              {/* 厂商宣称 */}
              <div className="mb-2 ml-7 rounded-md bg-gray-100 px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase text-gray-400">
                  宣称
                </span>
                <p className="text-xs text-gray-500">
                  {item.officialClaim || '...'}
                </p>
              </div>

              {/* 真实情况 */}
              <div className="ml-7 rounded-md border border-red-200 bg-red-50 px-3 py-1.5">
                <span className="text-[10px] font-semibold uppercase text-red-400">
                  真相
                </span>
                <p className="text-xs text-red-700">
                  {item.truth || '...'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}
    </section>
  );
}
