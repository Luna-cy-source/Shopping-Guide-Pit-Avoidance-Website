'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// ============================================
// Props
// ============================================
interface MarkdownRendererProps {
  /** Markdown 源文本 */
  content: string;
  /** 是否处于流式传输中（内容可能还在增长） */
  isStreaming?: boolean;
  /** 自定义 CSS 类名 */
  className?: string;
}

// ============================================
// 组件自定义渲染规则
//   将标准 Markdown AST 映射为 Tailwind 排版组件
// ============================================
const components: Partial<Components> = {
  // 段落
  p({ children, ...props }) {
    return (
      <p className="leading-relaxed text-gray-700 [&:not(:last-child)]:mb-2" {...props}>
        {children}
      </p>
    );
  },

  // 加粗文字
  strong({ children, ...props }) {
    return (
      <strong className="font-bold text-gray-900" {...props}>
        {children}
      </strong>
    );
  },

  // 行内代码
  code({ children, className, ...props }) {
    // 如果是代码块（有 language- 前缀类名），由 pre/code 组合处理
    const isInline = !className?.includes('language-');
    if (isInline) {
      return (
        <code
          className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em] font-mono text-red-600"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`${className ?? ''} text-sm`} {...props}>
        {children}
      </code>
    );
  },

  // 代码块
  pre({ children, ...props }) {
    return (
      <pre
        className="my-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed"
        {...props}
      >
        {children}
      </pre>
    );
  },

  // 无序列表
  ul({ children, ...props }) {
    return (
      <ul className="my-2 list-disc space-y-1 pl-6 text-gray-700" {...props}>
        {children}
      </ul>
    );
  },

  // 有序列表
  ol({ children, ...props }) {
    return (
      <ol className="my-2 list-decimal space-y-1 pl-6 text-gray-700" {...props}>
        {children}
      </ol>
    );
  },

  // 列表项
  li({ children, ...props }) {
    return (
      <li className="leading-relaxed" {...props}>
        {children}
      </li>
    );
  },

  // 一级标题（h1）
  h1({ children, ...props }) {
    return (
      <h1 className="mb-3 mt-4 text-lg font-bold text-gray-900" {...props}>
        {children}
      </h1>
    );
  },

  // 二级标题
  h2({ children, ...props }) {
    return (
      <h2 className="mb-2 mt-3 text-base font-bold text-gray-800" {...props}>
        {children}
      </h2>
    );
  },

  // 三级标题
  h3({ children, ...props }) {
    return (
      <h3 className="mb-2 mt-3 text-sm font-bold text-gray-800" {...props}>
        {children}
      </h3>
    );
  },

  // 水平分割线
  hr(props) {
    return <hr className="my-4 border-gray-200" {...props} />;
  },

  // 引用块
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="my-2 border-l-2 border-gray-300 bg-gray-50/70 px-4 py-2 italic text-gray-600"
        {...props}
      >
        {children}
      </blockquote>
    );
  },

  // 强调/斜体
  em({ children, ...props }) {
    return (
      <em className="italic text-gray-600" {...props}>
        {children}
      </em>
    );
  },

  // 删除线
  del({ children, ...props }) {
    return (
      <del className="text-gray-400 line-through" {...props}>
        {children}
      </del>
    );
  },

  // 表格（GFM 支持）
  table({ children, ...props }) {
    return (
      <div className="my-3 overflow-x-auto">
        <table
          className="min-w-full border-collapse rounded-lg border border-gray-200 text-sm"
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },

  thead({ children, ...props }) {
    return (
      <thead className="bg-gray-50" {...props}>
        {children}
      </thead>
    );
  },

  th({ children, ...props }) {
    return (
      <th
        className="border border-gray-200 px-3 py-1.5 text-left text-xs font-semibold text-gray-600"
        {...props}
      >
        {children}
      </th>
    );
  },

  td({ children, ...props }) {
    return (
      <td
        className="border border-gray-200 px-3 py-1.5 text-gray-700"
        {...props}
      >
        {children}
      </td>
    );
  },

  // 链接
  a({ children, href, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-red-500 underline decoration-red-200 underline-offset-2 transition-colors hover:text-red-600 hover:decoration-red-400"
        {...props}
      >
        {children}
      </a>
    );
  },
};

// ============================================
// MarkdownRenderer — 将大模型吐出的 Markdown 文本
//   渲染为 Tailwind 排版的 HTML，支持：
//   - 加粗、斜体、删除线
//   - 有序/无序列表
//   - 代码行内 + 代码块
//   - 表格（GFM）
//   - 引用块
//   - 链接
//   - 淡入动画
//   - 流式光标提示
// ============================================
export default function MarkdownRenderer({
  content,
  isStreaming = false,
  className = '',
}: MarkdownRendererProps) {
  // 用 useMemo 缓存渲染结果，避免每次重渲染都重新解析 Markdown
  const rendered = useMemo(() => {
    if (!content) return null;

    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    );
  }, [content]);

  if (!rendered) return null;

  return (
    <div className={`animate-fade-in-up ${className}`}>
      {rendered}

      {/* 流式传输中 → 闪烁光标模拟"专家正在打字" */}
      {isStreaming && (
        <span
          className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-blink-cursor rounded-full bg-red-400 align-text-bottom"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
