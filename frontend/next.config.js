/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 开发环境代理：将 /api/* 请求转发到 Worker (localhost:8787)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8787/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
