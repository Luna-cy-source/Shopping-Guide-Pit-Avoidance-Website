import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ReportStreamerWrapper from '../../components/ReportStreamerWrapper';
import MiniSearch from '../../components/MiniSearch';
import AuthButtons from '../../components/AuthButtons';
import BookmarkButton from '../../components/BookmarkButton';
import PitSubmissionModal from '../../components/PitSubmissionModal';


// ============================================
// 动态生成 SEO Metadata（服务端）
// ============================================
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const rawQuery = q || '';
  const decoded = rawQuery ? decodeURIComponent(rawQuery) : '';

  const cleanName = decoded
    .replace(/[？?！!。，,、\s]+.*$/, '')
    .replace(/\s*怎么样\s*$/, '')
    .replace(/\s*值得买吗\s*$/, '')
    .replace(/\s*好不好\s*$/, '')
    .replace(/\s*评价\s*$/, '')
    .replace(/\s*测评\s*$/, '')
    .replace(/\s*口碑\s*$/, '')
    .trim();

  const productName = cleanName || decoded || '商品';

  const title = `「${productName}」避坑报告_实测参数扒皮_是否智商税 | AI避坑导购`;
  const description = `🔥「${productName}」深度实测避坑报告：隐形短板逐一揭露、营销陷阱大起底、智商税分析。AI独立检测实验室结合海量真实用户评价，客观拆解「${productName}」是否值得买，不恰饭、讲真话。`;

  return {
    title,
    description,
    keywords: [
      productName,
      '避坑',
      '测评',
      '智商税',
      '真实评价',
      '性价比',
      '消费陷阱',
      'AI避坑导购',
      '值得买吗',
      '实测参数',
    ],
    openGraph: {
      title,
      description,
      type: 'article',
      locale: 'zh_CN',
      siteName: 'AI避坑导购',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': 320,
      'max-image-preview': 'large',
    },
  };
}

// ============================================
// 页面组件
// ============================================
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  
  // 没有查询参数 → 重定向到首页
  if (!q) {
    redirect('/');
  }

  const decodedQuery = decodeURIComponent(q);
  const reportPath = `/report?q=${encodeURIComponent(decodedQuery)}`;

  return (
    <div className="min-h-screen bg-white">
      {/* ---- 顶部 Mini 搜索栏 ---- */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          {/* Logo 返回首页 */}
          <a
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-bold text-gray-900 transition-opacity hover:opacity-70"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            AI 避坑
          </a>

          {/* 当前检测商品标签 */}
          <span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 sm:inline-block">
            检测中：{decodedQuery}
          </span>

          {/* 收藏此报告按钮 */}
          <BookmarkButton
            productName={decodedQuery}
            reportPath={reportPath}
          />

          {/* Mini 搜索表单 */}
          <MiniSearch />

          {/* 登录按钮 */}
          <AuthButtons />
        </div>
      </header>

      {/* ---- 主体内容区 ---- */}
      <main className="mx-auto max-w-5xl px-4 py-8">
      {/* 报告标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          「{decodedQuery}」避坑报告
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          AI 独立检测实验室 · 客观分析 · 不恰饭
        </p>
        <div className="mt-4 divider-warn" />
      </div>

        {/* 流式渲染组件 */}
        <ReportStreamerWrapper query={decodedQuery} />

        {/* 避坑线索提交 */}
        <div className="mt-12 flex justify-center">
          <PitSubmissionModal productName={decodedQuery} />
        </div>
      </main>

      {/* 底部 */}
      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-300">
        本报告由 AI 生成，仅供参考。购买链接可能会使实验室获得微小分成，用于维持服务器运转。
      </footer>
    </div>
  );
}
