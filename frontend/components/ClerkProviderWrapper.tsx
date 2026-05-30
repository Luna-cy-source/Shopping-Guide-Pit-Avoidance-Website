'use client';

import { ClerkProvider } from '@clerk/clerk-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();

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
