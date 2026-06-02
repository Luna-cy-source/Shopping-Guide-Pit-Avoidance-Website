'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../hooks/useAuth';

/**
 * 认证 Provider — 替代原 ClerkProviderWrapper
 * 使用自定义 localStorage 认证系统，不依赖第三方服务
 */
export default function AuthProviderWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
