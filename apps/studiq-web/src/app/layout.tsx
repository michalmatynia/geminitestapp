import { Suspense } from 'react';

import { StudiqQueryProvider } from '../providers/QueryProvider';
import { StudiqRootLoadingFallback } from '../components/StudiqRootLoadingFallback';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import {
  LITE_SETTINGS_HYDRATION_ELEMENT_ID,
  serializeLiteSettingsHydrationData,
} from '@/shared/lib/lite-settings-hydration';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { safeHtml } from '@/shared/lib/security/safe-html';

import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'StudiQ',
};

export async function StudiqRootContent({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const liteSettings = await getLiteSettingsForHydration();
  const liteSettingsHydrationJson =
    liteSettings.length > 0
      ? serializeLiteSettingsHydrationData(liteSettings)
      : null;

  return (
    <>
      {liteSettingsHydrationJson !== null ? (
        <script
          id={LITE_SETTINGS_HYDRATION_ELEMENT_ID}
          type='application/json'
          dangerouslySetInnerHTML={{
            __html: safeHtml(liteSettingsHydrationJson),
          }}
        />
      ) : null}
      <StudiqQueryProvider initialLiteSettings={liteSettings}>
        <main id='kangur-main-content'>{children}</main>
      </StudiqQueryProvider>
    </>
  );
}

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
        <Suspense fallback={<StudiqRootLoadingFallback />}>
          <StudiqRootContent>{children}</StudiqRootContent>
        </Suspense>
      </body>
    </html>
  );
}
