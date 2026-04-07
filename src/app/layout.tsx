import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { RootClientShell } from './_providers/RootClientShell';
import { loadSiteMessages } from '@/i18n/messages';
import { cn } from '@/shared/utils/ui-utils';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
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
  const locale = await getLocale();
  const [commonTranslations, liteSettings, messages] = await Promise.all([
    getTranslations('Common'),
    getLiteSettingsForHydration(),
    loadSiteMessages(locale),
  ]);
  const sanitizedLiteSettingsScript =
    liteSettings.length > 0
      ? `self.__LITE_SETTINGS__=${JSON.stringify(liteSettings).replace(/</g, '\\u003c')}`
      : null;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        {sanitizedLiteSettingsScript ? (
          <script
            dangerouslySetInnerHTML={{
              __html: sanitizedLiteSettingsScript,
            }}
          />
        ) : null}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SkipToContentLink>{commonTranslations('skipToMainContent')}</SkipToContentLink>
          <RootClientShell>{children}</RootClientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
