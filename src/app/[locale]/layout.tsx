import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { loadSiteMessages } from '@/i18n/messages';
import {
  getStaticSiteLocaleParams,
  isSupportedSiteLocale,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

import type { Metadata } from 'next';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): Array<{ locale: string }> {
  return getStaticSiteLocaleParams();
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;

  if (!isSupportedSiteLocale(locale)) {
    return {};
  }

  const normalizedLocale = normalizeSiteLocale(locale);
  const routeTranslations = await getTranslations({
    locale: normalizedLocale,
    namespace: 'Routes',
  });
  const metadataTranslations = await getTranslations({
    locale: normalizedLocale,
    namespace: 'Metadata',
  });
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

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<React.JSX.Element> {
  const { locale } = await params;

  if (!isSupportedSiteLocale(locale)) {
    notFound();
  }

  const normalizedLocale = normalizeSiteLocale(locale);
  setRequestLocale(normalizedLocale);
  const messages = await loadSiteMessages(normalizedLocale);

  return (
    <AppIntlProvider locale={normalizedLocale} messages={messages}>
      <HtmlLangSync locale={normalizedLocale} />
      {children}
    </AppIntlProvider>
  );
}
