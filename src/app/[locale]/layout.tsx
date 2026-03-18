import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import {
  getStaticSiteLocaleParams,
  isSupportedSiteLocale,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): Array<{ locale: string }> {
  return getStaticSiteLocaleParams();
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

  return (
    <NextIntlClientProvider locale={normalizedLocale}>
      <HtmlLangSync locale={normalizedLocale} />
      {children}
    </NextIntlClientProvider>
  );
}
