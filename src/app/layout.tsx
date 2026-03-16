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
import { cn } from '@/shared/utils';

import type { Metadata, Viewport } from 'next';

import './fonts.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'StudiQ',
    template: '%s | StudiQ',
  },
  description: 'StudiQ admin workspace and storefront.',
  applicationName: 'StudiQ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        <SkipToContentLink />
        <RouteAccessibilityAnnouncer />
        <ToastProvider>
          <QueryProvider>
            <SettingsStoreProvider mode='lite'>
              <AppFontProvider />
              <BackgroundSyncProvider>
                <SessionProvider>
                  <ThemeProvider
                    attribute='class'
                    defaultTheme='system'
                    enableSystem
                    disableTransitionOnChange
                  >
                    <CsrfProvider />
                    <UrlGuardProvider />
                    <Suspense fallback={<></>}>
                      <ClientErrorReporter />
                    </Suspense>
                    <Suspense fallback={<></>}>
                      <PageAnalyticsTracker />
                    </Suspense>
                    <AppErrorBoundary source='RootLayout'>{children}</AppErrorBoundary>
                  </ThemeProvider>
                </SessionProvider>
              </BackgroundSyncProvider>
            </SettingsStoreProvider>
          </QueryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
