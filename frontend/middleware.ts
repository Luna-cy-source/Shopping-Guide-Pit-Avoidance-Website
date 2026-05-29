import { clerkMiddleware } from '@clerk/nextjs/server';

// =====================================================
// Clerk 中间件
// 默认不拦截任何路由（首页搜索完全免登录）
// 只在后续需要登录的页面通过 createRouteMatcher 添加规则
// =====================================================
export default clerkMiddleware({
  // 开发环境禁用 handshake 以避免密钥验证问题
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
});

export const config = {
  matcher: [
    // 跳过 Next.js 内部路由和静态资源
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
