'use client';

import { ClerkProvider } from '@clerk/clerk-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();

  // 构建时没有 publishableKey → 跳过 Clerk，纯静态渲染
  if (!PUBLISHABLE_KEY) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  );
}
