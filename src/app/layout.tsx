import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';

import { RootClientShell } from './_providers/RootClientShell';
import { cn } from '@/shared/utils';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { readServerRequestPathname } from '@/shared/lib/request/server-request-context';

import type { Metadata, Viewport } from 'next';

import './fonts.css';
import './globals.css';

const isExplicitKangurAliasRequest = (pathname: string | null): boolean => {
  if (!pathname) {
    return false;
  }

  const normalizedPathname = stripSiteLocalePrefix(pathname);
  return normalizedPathname === '/kangur' || normalizedPathname.startsWith('/kangur/');
};

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
  const requestPathname = readServerRequestPathname();
  const shouldHydrateLiteSettings = !isExplicitKangurAliasRequest(requestPathname);
  const [locale, commonTranslations, liteSettings] = await Promise.all([
    getLocale(),
    getTranslations('Common'),
    shouldHydrateLiteSettings ? getLiteSettingsForHydration() : Promise.resolve([]),
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
        <NextIntlClientProvider locale={locale}>
          <a href='#kangur-main-content' className='app-skip-link'>
            {commonTranslations('skipToMainContent')}
          </a>
          <RootClientShell>{children}</RootClientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
