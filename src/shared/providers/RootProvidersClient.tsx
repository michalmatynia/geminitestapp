'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { lazy, Suspense } from 'react';

import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import ClientErrorReporter from '@/shared/lib/observability/components/ClientErrorReporter';
import PageAnalyticsTracker from '@/shared/lib/analytics/components/PageAnalyticsTracker';
import { AppFontProvider } from '@/shared/providers/AppFontProvider';
import { BackgroundSyncProvider } from '@/shared/providers/BackgroundSyncProvider';
import { QueryProvider, type QueryProviderMode } from '@/shared/providers/QueryProvider';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ThemeProvider } from '@/shared/providers/theme-provider';
import { AppErrorBoundary } from '@/shared/ui/AppErrorBoundary';
import { RouteAccessibilityAnnouncer } from '@/shared/ui/RouteAccessibilityAnnouncer';
import { ToastProvider } from '@/shared/ui/toast';

const LazyCsrfProvider = lazy(() => import('@/shared/providers/CsrfProvider'));
const LazyUrlGuardProvider = lazy(() =>
  import('@/shared/providers/UrlGuardProvider').then((m) => ({ default: m.UrlGuardProvider }))
);

const KANGUR_CAPTURE_MODE_QUERY_PARAM = 'kangurCapture';
const KANGUR_CAPTURE_MODE_SOCIAL_BATCH = 'social-batch';

const resolveRootProviderPathname = (pathname: string | null): string => {
  if (typeof pathname === 'string' && pathname.trim() !== '') {
    return pathname.trim();
  }

  if (typeof window === 'undefined') {
    return '/';
  }

  const browserPathname = window.location.pathname.trim();
  return browserPathname === '' ? '/' : browserPathname;
};

const resolveQueryProviderModeForPath = (pathname: string | null): QueryProviderMode => {
  const normalizedPathname = stripSiteLocalePrefix(resolveRootProviderPathname(pathname));
  const shouldUseFullRuntime =
    normalizedPathname.startsWith('/admin') ||
    normalizedPathname === '/kangur' ||
    normalizedPathname.startsWith('/kangur/');

  return shouldUseFullRuntime ? 'full' : 'light';
};

function RootProviderFrame({
  children,
  isSyntheticKangurCapture,
  queryProviderMode,
}: {
  children: React.ReactNode;
  isSyntheticKangurCapture: boolean;
  queryProviderMode: QueryProviderMode;
}): React.JSX.Element {
  return (
    <>
      <RouteAccessibilityAnnouncer />
      <ToastProvider>
        <QueryProvider mode={queryProviderMode}>
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
                  <Suspense fallback={null}>
                    <LazyCsrfProvider />
                    <LazyUrlGuardProvider />
                  </Suspense>
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

function SearchParamAwareRootProviders({
  children,
  queryProviderMode,
}: {
  children: React.ReactNode;
  queryProviderMode: QueryProviderMode;
}): React.JSX.Element {
  const searchParams = useSearchParams();
  const isSyntheticKangurCapture =
    searchParams?.get(KANGUR_CAPTURE_MODE_QUERY_PARAM) === KANGUR_CAPTURE_MODE_SOCIAL_BATCH;

  return (
    <RootProviderFrame
      isSyntheticKangurCapture={isSyntheticKangurCapture}
      queryProviderMode={queryProviderMode}
    >
      {children}
    </RootProviderFrame>
  );
}

export function RootProvidersClient({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const queryProviderMode = resolveQueryProviderModeForPath(pathname);

  return (
    <Suspense
      fallback={
        <RootProviderFrame
          isSyntheticKangurCapture={false}
          queryProviderMode={queryProviderMode}
        >
          {children}
        </RootProviderFrame>
      }
    >
      <SearchParamAwareRootProviders queryProviderMode={queryProviderMode}>
        {children}
      </SearchParamAwareRootProviders>
    </Suspense>
  );
}
