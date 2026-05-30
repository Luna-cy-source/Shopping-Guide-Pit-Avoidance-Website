import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '商品避坑报告 | AI避坑导购',
  description:
    'AI独立检测实验室深度拆解商品隐形短板、营销陷阱、智商税，用大白话告诉你值不值得买。',
  keywords: ['避坑', '报告', '测评', '智商税', 'AI分析'],
  openGraph: {
    title: '商品避坑报告 | AI 避坑导购',
    description: '深度分析商品坑点，不恰饭、不回避、不模棱两可。',
    type: 'article',
    locale: 'zh_CN',
  },
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
