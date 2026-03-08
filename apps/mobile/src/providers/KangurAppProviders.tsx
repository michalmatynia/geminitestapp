import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { KangurMobileAuthProvider } from '../auth/KangurMobileAuthContext';
import { KangurRuntimeProvider } from './KangurRuntimeContext';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });

export function KangurAppProviders({
  children,
}: PropsWithChildren): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <KangurRuntimeProvider>
          <KangurMobileAuthProvider>{children}</KangurMobileAuthProvider>
        </KangurRuntimeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
