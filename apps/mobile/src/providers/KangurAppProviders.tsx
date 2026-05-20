import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';

import { KangurMobileAuthProvider } from '../auth/KangurMobileAuthContext';
import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';
import { KangurRuntimeProvider } from './KangurRuntimeContext';

/**
 * Kangur App Providers
 *
 * Configures the mobile application's global provider stack, including:
 * - QueryClientProvider: TanStack Query for state management and caching.
 * - SafeAreaProvider: React Native safe area handling.
 * - KangurRuntimeProvider: Domain-specific runtime configuration.
 * - KangurMobileI18nProvider: Mobile-specific internationalization.
 * - KangurMobileAuthProvider: Mobile authentication session management.
 */
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
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <KangurRuntimeProvider>
          <KangurMobileI18nProvider>
            <KangurMobileAuthProvider>{children}</KangurMobileAuthProvider>
          </KangurMobileI18nProvider>
        </KangurRuntimeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
