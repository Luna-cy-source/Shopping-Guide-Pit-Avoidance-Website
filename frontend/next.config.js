/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 静态导出，适配 Cloudflare Pages
  images: {
    unoptimized: true, // 静态导出不支持 Next.js 图片优化
  },
};

module.exports = nextConfig;
