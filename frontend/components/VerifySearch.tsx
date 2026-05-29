'use client';

import { useMemo } from 'react';

// ============================================
// 第三方验证搜索组件
// 一键跳转至 B站 / 小红书 / 什么值得买 验证报告
// ============================================

interface VerifySearchProps {
  productName: string;
  className?: string;
}

interface VerifyPlatform {
  id: string;
  label: string;
  subLabel: string;
  /** 搜索链接，用 {keyword} 占位 */
  urlTemplate: string;
  /** 搜索关键词后缀 */
  keywordSuffix: string;
  /** 品牌色 */
  color: string;
  /** 图标 SVG path */
  icon: React.ReactNode;
}

export default function VerifySearch({ productName, className }: VerifySearchProps) {
  const platforms: VerifyPlatform[] = useMemo(
    () => [
      {
        id: 'bilibili',
        label: 'B站搜实测',
        subLabel: '看真实视频',
        urlTemplate: 'https://search.bilibili.com/all?keyword={keyword}',
        keywordSuffix: '翻车',
        color: '#FB7299',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 01-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.32a1.8 1.8 0 01.187-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.396.786 1.894.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.13.786-1.894v-7.52c-.017-.764-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" />
          </svg>
        ),
      },
      {
        id: 'xiaohongshu',
        label: '小红书搜避坑',
        subLabel: '看真实笔记',
        urlTemplate: 'https://www.xiaohongshu.com/search_result?keyword={keyword}',
        keywordSuffix: '避坑',
        color: '#FF2442',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" opacity="0.15" />
            <path d="M12 3a9 9 0 00-9 9v.42c0 .23.18.42.4.42h2.04c.2 0 .36-.17.38-.38A6.54 6.54 0 0112 6.6c3.7 0 6.42 3.48 5.46 7.32-.38 1.54-1.18 3.04-2.62 3.62-.74.3-1.58.26-2.24-.16a2.52 2.52 0 01-1-.7 3.3 3.3 0 01-1.14.92c-.5.24-1.08.2-1.5-.08a1.7 1.7 0 01-.62-.66c-.26-.52-.28-1.12-.08-1.66.36-1 1.12-1.8 2.1-2.12.88-.28 1.88-.1 2.54.56l.04.04c.1.12.28.14.4.06l.82-.52c.12-.08.14-.24.06-.36a6.74 6.74 0 00-2.94-2.66A6.6 6.6 0 0012 10.6c-1.38 0-2.7.4-3.84 1.14-.2.12-.44-.02-.44-.26v-5.1c0-.22.18-.4.4-.38h2.14c.2 0 .36-.18.36-.38V5.4c0-.22-.18-.4-.4-.4H4.08c-.2 0-.36.18-.36.38V6c0 .2.18.36.4.38h1.08c.2 0 .36.18.36.4v9.82c0 .22-.18.4-.4.38H4.07c-.2 0-.37.18-.37.4v.62c0 .22.18.4.4.38h6.96c.2 0 .36-.18.36-.38v-.64c0-.2-.18-.36-.4-.38H9.97c-.2 0-.36-.18-.36-.4v-2.14c.82.62 1.86.84 2.86.66 1.94-.36 3.42-1.78 4.22-3.56 1-2.24.66-4.98-1.22-6.52C14.08 3.68 13.06 3 12 3z" />
          </svg>
        ),
      },
      {
        id: 'smzdm',
        label: '什么值得买查价',
        subLabel: '看历史低价',
        urlTemplate: 'https://search.smzdm.com/?c=home&s={keyword}',
        keywordSuffix: '',
        color: '#E1251B',
        icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <rect x="2" y="5" width="20" height="14" rx="3" fill="currentColor" opacity="0.12" />
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill="currentColor"
            />
          </svg>
        ),
      },
    ],
    []
  );

  const buildUrl = (template: string, suffix: string): string => {
    const keyword = suffix
      ? `${encodeURIComponent(productName)}+${encodeURIComponent(suffix)}`
      : encodeURIComponent(productName);
    return template.replace('{keyword}', keyword);
  };

  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-5 ${className ?? ''}`}>
      {/* 标题 */}
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <svg
          className="h-4 w-4 text-blue-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
          />
        </svg>
        一键去第三方平台验证
      </h3>
      <p className="mb-4 text-xs text-gray-400">
        我们的分析完全公开，欢迎去其他平台交叉验证
      </p>

      {/* 三个按钮 */}
      <div className="flex flex-wrap gap-3">
        {platforms.map((p) => (
          <a
            key={p.id}
            href={buildUrl(p.urlTemplate, p.keywordSuffix)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-1 min-w-[160px] items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 transition-all hover:border-gray-300 hover:bg-white hover:shadow-sm"
          >
            {/* 图标 */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: `${p.color}14`, color: p.color }}
            >
              {p.icon}
            </div>

            {/* 文字 */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                {p.label}
              </span>
              <span className="text-[11px] text-gray-400">
                {p.subLabel}
              </span>
            </div>

            {/* 外链箭头 */}
            <svg
              className="ml-auto h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors group-hover:text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        ))}
      </div>

      {/* 底部说明 */}
      <p className="mt-3 text-[11px] text-gray-350 leading-relaxed" style={{ color: '#9ca3af' }}>
        <span className="inline-block mr-1 text-gray-400">🔗</span>
        以上链接将在新标签页中打开，搜索结果由各平台独立提供，AI 不会干预结果
      </p>
    </section>
  );
}
