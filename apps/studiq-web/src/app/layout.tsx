import { Suspense } from 'react';

import KangurLoadingFallback from '../components/KangurLoadingFallback';
import { StudiqQueryProvider } from '../providers/QueryProvider';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';

import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import './globals.css';
import './kangur/kangur.css';

export const metadata: Metadata = {
  title: 'StudiQ',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const liteSettings = await getLiteSettingsForHydration();
  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;

  return (
    <html
      lang={DEFAULT_SITE_I18N_CONFIG.defaultLocale}
      className='kangur-surface-active'
      suppressHydrationWarning
    >
      <body className='kangur-surface-active'>
        {sanitizedLiteSettingsScript ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <Suspense fallback={<KangurLoadingFallback />}>
          <StudiqQueryProvider>
            <main id='kangur-main-content'>{children}</main>
          </StudiqQueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
