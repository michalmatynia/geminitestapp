import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { loadSiteMessages } from '@/i18n/messages';
import {
  getStaticSiteLocaleParams,
  isSupportedSiteLocale,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { AppIntlProvider } from '@/shared/providers/AppIntlProvider';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

import type { ReactNode } from 'react';

type LocaleLayoutProps = {
  children: ReactNode;
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
  const messages = await loadSiteMessages(normalizedLocale);

  return (
    <AppIntlProvider locale={normalizedLocale} messages={messages}>
      <HtmlLangSync locale={normalizedLocale} />
      {children}
    </AppIntlProvider>
  );
}
