'use client';

import { useState } from 'react';

// ============================================
// Props
// ============================================
export interface CommerceBannerProps {
  /** 商品名称，用于跳转搜索 */
  productName: string;
  /** 预留：后续接入京东联盟/淘宝客 API 后的跳转 URL */
  affiliateUrl?: string;
  /** 是否显示在替代品推荐区域（控制间距样式） */
  variant?: 'inline' | 'standalone';
}

// ============================================
// 构建默认搜索跳转链接（未接入联盟 API 前的兜底）
//   京东搜索：https://search.jd.com/Search?keyword=xxx
//   预留参数，后续替换为 actual affiliate deeplink
// ============================================
function buildDefaultUrl(productName: string): string {
  const encoded = encodeURIComponent(productName);
  return `https://search.jd.com/Search?keyword=${encoded}&enc=utf-8`;
}

// ============================================
// CommerceBanner — 极简购买跳转按钮 + 透明度声明
// ============================================
export default function CommerceBanner({
  productName,
  affiliateUrl,
  variant = 'standalone',
}: CommerceBannerProps) {
  const [clicked, setClicked] = useState(false);
  const targetUrl = affiliateUrl || buildDefaultUrl(productName);

  const handleClick = () => {
    setClicked(true);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={
        variant === 'standalone'
          ? 'rounded-xl border border-gray-100 bg-gray-50/50 p-5'
          : ''
      }
    >
      {/* 主按钮行 */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {/* 左侧描述 */}
        <p className="text-sm font-medium text-gray-600">
          觉得这篇报告有用？支持一下实验室
        </p>

        {/* 购买按钮 */}
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold
            transition-all duration-200
            ${
              clicked
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-700 active:scale-[0.97]'
            }`}
          title={`在第三方平台搜索「${productName}」`}
        >
          {/* 🛒 图标 */}
          <svg
            className="h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>

          <span>{clicked ? '已跳转，感谢支持 ❤️' : '🛒 查看全网最低价'}</span>

          {/* 外链箭头 */}
          <svg
            className="h-3 w-3 shrink-0 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </button>
      </div>

      {/* 透明度/免责声明 */}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-gray-300 sm:text-left">
        如果您觉得报告有帮助，通过此链接购买，实验室可能会获得微小分成，这笔钱将用于维持服务器运转。
      </p>
    </div>
  );
}
