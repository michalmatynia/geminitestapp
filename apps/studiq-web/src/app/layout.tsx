import { Suspense } from 'react';

import KangurLoadingFallback from '../components/KangurLoadingFallback';
import { StudiqQueryProvider } from '../providers/QueryProvider';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import './globals.css';
import './kangur/kangur.css';

export const metadata: Metadata = {
  title: 'StudiQ',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html
      lang={DEFAULT_SITE_I18N_CONFIG.defaultLocale}
      className='kangur-surface-active'
      suppressHydrationWarning
    >
      <body className='kangur-surface-active'>
        <Suspense fallback={<KangurLoadingFallback />}>
          <StudiqQueryProvider>
            <main id='kangur-main-content'>{children}</main>
          </StudiqQueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
