// =====================================================
// 全局页脚 — 极简实验室风格
// 版权信息 + 实验室声明
// =====================================================

export default function Footer() {
  return (
    <footer className="relative z-[1] mt-auto border-t border-slate-100 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
        {/* 左侧 */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            />
          </svg>
          <span>AI避坑独立实验室 © {new Date().getFullYear()}</span>
        </div>

        {/* 右侧声明 */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            AI驱动 · 数据溯源
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-amber-400" />
            只对消费者负责
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-blue-400" />
            不恰饭 · 不回避 · 不模棱两可
          </span>
        </div>
      </div>
    </footer>
  );
}
