'use client';

import { SessionProvider } from 'next-auth/react';

import type { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode; mode?: 'public' | 'admin' }): React.JSX.Element {
  return <SessionProvider>{children}</SessionProvider>;
}
