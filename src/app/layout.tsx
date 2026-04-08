import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { RootClientShell } from './_providers/RootClientShell';
import { loadSiteMessages } from '@/i18n/messages';
import { APP_FONT_SET_SETTING_KEY } from '@/shared/constants/typography';
import { cn } from '@/shared/utils/ui-utils';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';
import { SkipToContentLink } from '@/shared/ui/SkipToContentLink';

import type { Metadata, Viewport } from 'next';

import './fonts.css';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const routeTranslations = await getTranslations({ locale, namespace: 'Routes' });
  const metadataTranslations = await getTranslations({ locale, namespace: 'Metadata' });
  const siteTitle = routeTranslations('siteTitle');

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: metadataTranslations('siteDescription'),
    applicationName: siteTitle,
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const messagesPromise = loadSiteMessages(locale);
  const liteSettingsPromise = getLiteSettingsForHydration();

  const [messages, liteSettings] = await Promise.all([messagesPromise, liteSettingsPromise]);

  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;

  const fontSetId =
    liteSettings.find((s) => s.key === APP_FONT_SET_SETTING_KEY)?.value || 'system';
  const skipToMainContentLabel =
    typeof messages['Common'] === 'object' &&
    messages['Common'] !== null &&
    typeof messages['Common']['skipToMainContent'] === 'string'
      ? messages['Common']['skipToMainContent']
      : 'Skip to main content';

  return (
    <html lang={locale} data-app-font-set={fontSetId} suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        {sanitizedLiteSettingsScript ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <AppIntlProvider locale={locale} messages={messages}>
          <SkipToContentLink>{skipToMainContentLabel}</SkipToContentLink>
          <Suspense fallback={<main id='kangur-main-content' className='min-h-screen' />}>
            <RootClientShell>{children}</RootClientShell>
          </Suspense>
        </AppIntlProvider>
      </body>
    </html>
  );
}
