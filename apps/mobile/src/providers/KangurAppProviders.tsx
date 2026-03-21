import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { KangurMobileAuthProvider } from '../auth/KangurMobileAuthContext';
import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import { KangurRuntimeProvider } from './KangurRuntimeContext';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
      },
      queries: {
        retry: 1,
        staleTime: 30_000,
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
          <KangurMobileI18nProvider>
            <KangurMobileAuthProvider>{children}</KangurMobileAuthProvider>
          </KangurMobileI18nProvider>
        </KangurRuntimeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
