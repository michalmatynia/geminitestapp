import { Suspense } from 'react';

import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';
import { cn } from '@/shared/utils/ui-utils';

import { DatabaseEngineRootProviders } from '../components/DatabaseEngineRootProviders';
import { loadDatabaseEngineMessages } from '../i18n/messages';
import { getLiteSettingsForHydration } from '../server/settings/lite-ssr';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './fonts.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Database Engine',
    template: '%s | Database Engine',
  },
  applicationName: 'Database Engine',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const [messages, liteSettings] = await Promise.all([
    loadDatabaseEngineMessages(locale),
    getLiteSettingsForHydration(),
  ]);

  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;
  const fontSetId =
    liteSettings.find((setting) => setting.key === APP_FONT_SET_SETTING_KEY)?.value ?? 'system';
  const liteSettingsEntries = liteSettings.map(
    (setting) => [setting.key, setting.value] as const
  );

  return (
    <html lang={locale || 'en'} data-app-font-set={fontSetId} suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        {sanitizedLiteSettingsScript !== null ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <AppIntlProvider locale={locale} messages={messages}>
          <Suspense fallback={<div className='min-h-screen' aria-busy='true' />}>
            <DatabaseEngineRootProviders initialLiteSettings={liteSettingsEntries}>
              {children}
            </DatabaseEngineRootProviders>
          </Suspense>
        </AppIntlProvider>
      </body>
    </html>
  );
}
