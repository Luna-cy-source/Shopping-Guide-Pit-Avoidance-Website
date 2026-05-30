'use client';

import { ClerkProvider } from '@clerk/clerk-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export default function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ClerkProvider
      routerPush={(to) => router.push(to)}
      routerReplace={(to) => router.replace(to)}
    >
      {children}
    </ClerkProvider>
  );
}
