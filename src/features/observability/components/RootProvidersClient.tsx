'use client';

import { useSearchParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Suspense } from 'react';

import ClientErrorReporter from '@/features/observability/components/ClientErrorReporter';
import PageAnalyticsTracker from '@/shared/lib/analytics/components/PageAnalyticsTracker';
import { AppFontProvider } from '@/shared/providers/AppFontProvider';
import { BackgroundSyncProvider } from '@/shared/providers/BackgroundSyncProvider';
import { CsrfProvider } from '@/shared/providers/CsrfProvider';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { UrlGuardProvider } from '@/shared/providers/UrlGuardProvider';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { RouteAccessibilityAnnouncer } from '@/shared/ui/RouteAccessibilityAnnouncer';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';
import { ToastProvider } from '@/shared/ui/toast';

const KANGUR_CAPTURE_MODE_QUERY_PARAM = 'kangurCapture';
const KANGUR_CAPTURE_MODE_SOCIAL_BATCH = 'social-batch';

export function RootProvidersClient({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const searchParams = useSearchParams();
  const isSyntheticKangurCapture =
    searchParams?.get(KANGUR_CAPTURE_MODE_QUERY_PARAM) === KANGUR_CAPTURE_MODE_SOCIAL_BATCH;

  return (
    <>
      <SkipToContentLink />
      <RouteAccessibilityAnnouncer />
      <ToastProvider>
        <QueryProvider>
          <SettingsStoreProvider mode='lite' suppressOwnQuery={isSyntheticKangurCapture}>
            <AppFontProvider />
            <BackgroundSyncProvider>
              <SessionProvider
                refetchOnWindowFocus={false}
                session={isSyntheticKangurCapture ? null : undefined}
              >
                <ThemeProvider
                  attribute='class'
                  defaultTheme='system'
                  enableSystem
                  disableTransitionOnChange
                >
                  <CsrfProvider />
                  <UrlGuardProvider />
                  {!isSyntheticKangurCapture ? (
                    <>
                      <Suspense fallback={<></>}>
                        <ClientErrorReporter />
                      </Suspense>
                      <Suspense fallback={<></>}>
                        <PageAnalyticsTracker />
                      </Suspense>
                    </>
                  ) : null}
                  <AppErrorBoundary source='RootLayout'>{children}</AppErrorBoundary>
                </ThemeProvider>
              </SessionProvider>
            </BackgroundSyncProvider>
          </SettingsStoreProvider>
        </QueryProvider>
      </ToastProvider>
    </>
  );
}
