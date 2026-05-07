'use client';

import { SessionProvider } from 'next-auth/react';

import { AppFontProvider } from '@/shared/providers/AppFontProvider';
import { CsrfProvider } from '@/shared/providers/CsrfProvider';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { RouteAccessibilityAnnouncer } from '@/shared/ui/RouteAccessibilityAnnouncer';
import { ToastProvider } from '@/shared/ui/toast';

import type { ReactNode } from 'react';

export function DatabaseEngineRootProviders({
  children,
  initialLiteSettings,
}: {
  children: ReactNode;
  initialLiteSettings?: ReadonlyArray<readonly [string, string]>;
}): React.JSX.Element {
  return (
    <>
      <RouteAccessibilityAnnouncer />
      <ToastProvider>
        <QueryProvider mode='full'>
          <SettingsStoreProvider initialEntries={initialLiteSettings} mode='lite'>
            <SessionProvider
              refetchOnWindowFocus={false}
              refetchWhenOffline={false}
              refetchInterval={0}
            >
              <ThemeProvider
                attribute='class'
                defaultTheme='system'
                enableSystem
                disableTransitionOnChange
              >
                <CsrfProvider />
                <AppFontProvider />
                <AppErrorBoundary source='DatabaseEngineRootLayout'>{children}</AppErrorBoundary>
              </ThemeProvider>
            </SessionProvider>
          </SettingsStoreProvider>
        </QueryProvider>
      </ToastProvider>
    </>
  );
}
