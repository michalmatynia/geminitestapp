import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import KangurAppearanceLayout from '../../kangur/KangurAppearanceLayout';
import { loadSiteMessages } from '@/i18n/messages';
import {
  isSupportedSiteLocale,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

import type { ReactNode } from 'react';

type LocalizedKangurLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocalizedKangurLayout({
  children,
  params,
}: LocalizedKangurLayoutProps): Promise<ReactNode> {
  const { locale } = await params;

  if (!isSupportedSiteLocale(locale)) {
    notFound();
  }

  const normalizedLocale = normalizeSiteLocale(locale);
  setRequestLocale(normalizedLocale);
  const messages = await loadSiteMessages(normalizedLocale);

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      <HtmlLangSync locale={normalizedLocale} />
      <KangurAppearanceLayout>{children}</KangurAppearanceLayout>
    </NextIntlClientProvider>
  );
}
