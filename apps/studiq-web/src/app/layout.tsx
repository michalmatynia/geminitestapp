import { Suspense } from 'react';

import { RootClientShell } from '@/app/_providers/RootClientShell';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { loadSiteMessages } from '@/i18n/messages';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';

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
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const [messages, liteSettings] = await Promise.all([
    loadSiteMessages(locale),
    getLiteSettingsForHydration(),
  ]);
  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;

  return (
    <html lang={locale} className='kangur-surface-active' suppressHydrationWarning>
      <body className='kangur-surface-active' suppressHydrationWarning>
        {sanitizedLiteSettingsScript ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <Suspense fallback={<div className='min-h-screen' aria-busy='true' />}>
          <AppIntlProvider locale={locale} messages={messages}>
            <RootClientShell>
              <main id='kangur-main-content'>{children}</main>
            </RootClientShell>
          </AppIntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
