import type { Metadata } from 'next';
import ClerkProviderWrapper from '../components/ClerkProviderWrapper';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AiMascot from '../components/AiMascot';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 避坑导购 | 独立检测实验室',
  description:
    '不从商家拿佣金，只对消费者负责。深度拆解商品隐形短板、营销陷阱、智商税，用大白话告诉你值不值得买。',
  keywords: ['避坑', '导购', '评测', '消费决策', '智商税', 'AI分析'],
  openGraph: {
    title: 'AI 避坑导购 — 你的消费决策实验室',
    description: '深度分析商品坑点，不恰饭、不回避、不模棱两可。',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        {/* 弥散渐变氛围光背景 */}
        <div className="bg-ambient" aria-hidden="true" />

        <ClerkProviderWrapper>
          <Header />
          <div className="relative z-[1] flex flex-1 flex-col">{children}</div>
          <Footer />
          {/* 全局 AI 小探员 */}
          <AiMascot />
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}
