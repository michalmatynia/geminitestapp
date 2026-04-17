'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { ReactNode } from 'react';

let browserQueryClient: QueryClient | null = null;

const getQueryClient = (): QueryClient => {
  if (typeof window === 'undefined') {
    return new QueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient();
  }
  return browserQueryClient;
};

export function StudiqQueryProvider({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
