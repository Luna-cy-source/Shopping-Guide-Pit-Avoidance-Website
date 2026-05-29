'use client';

import { useEffect } from 'react';

// ============================================
// 注入 Schema.org Product JSON-LD 到页面 <head>
// Google 可以通过 JS 执行读取，对 SEO 有效
// ============================================
interface ProductStructuredDataProps {
  productName: string;
  score: number;
  productImage?: { url: string; alt: string };
  flaws: Array<{ title: string; analysis: string }>;
  query: string;
}

export function ProductStructuredData({
  productName,
  score,
  productImage,
  flaws,
  query,
}: ProductStructuredDataProps) {
  useEffect(() => {
    // 构建 Schema.org Product 结构化数据
    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productName,
      description: `「${productName}」AI避坑检测报告 — 综合评分 ${score}/10。${flaws.length} 个核心坑点逐一拆解，帮你避开隐形短板与营销陷阱。`,
    };

    // 产品图片（优先透明背景/白底渲染图）
    if (productImage?.url) {
      jsonLd.image = productImage.url;
    }

    // 综合评分 → aggregateRating
    // score 为 0-10，直接映射到 Schema ratingValue
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: score,
      bestRating: 10,
      worstRating: 0,
      reviewCount: flaws.length,
    };

    // 核心坑点 → Review（每条坑点是一条负面评价，ratingValue 较低）
    if (flaws.length > 0) {
      jsonLd.review = flaws.map((flaw) => ({
        '@type': 'Review',
        name: `坑点：${flaw.title}`,
        reviewBody: flaw.analysis,
        author: {
          '@type': 'Organization',
          name: 'AI避坑导购',
          url: 'https://aibigeng.com',
        },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: 3,
          bestRating: 10,
          worstRating: 0,
          description: '该坑点影响综合体验',
        },
      }));
    }

    // 商品页面 URL
    try {
      const pageUrl = new URL(window.location.href);
      jsonLd.offers = {
        '@type': 'Offer',
        url: pageUrl.origin + pageUrl.pathname,
        availability: 'https://schema.org/InStock',
        price: '0',
        priceCurrency: 'CNY',
        itemCondition: 'https://schema.org/NewCondition',
      };
      jsonLd.url = pageUrl.origin + pageUrl.pathname;
    } catch {
      // URL 构造失败则跳过
    }

    // 品牌信息（从产品名推断）
    const brandGuess = productName.split(/[\s\-·]+/)[0];
    if (brandGuess && brandGuess.length >= 2) {
      jsonLd.brand = {
        '@type': 'Brand',
        name: brandGuess,
      };
    }

    // 移除旧脚本（避免重复，支持流式更新时替换）
    const existing = document.getElementById('product-structured-data');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-structured-data';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('product-structured-data');
      if (el) el.remove();
    };
  }, [productName, score, productImage?.url, JSON.stringify(flaws), query]);

  return null;
}
