/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 静态导出，适配 Cloudflare Pages
  images: {
    unoptimized: true, // 静态导出不支持 Next.js 图片优化
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8787/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    // 处理 @clerk/shared 的 .mjs 文件：强制走 javascript/auto 模式，
    // 使其 CJS 的 swr 导入能正确做 default interop
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/@clerk/,
      type: 'javascript/auto',
    });
    return config;
  },
};

module.exports = nextConfig;
