import { NextIntlClientProvider } from 'next-intl';

import KangurAppearanceLayout from './KangurAppearanceLayout';
import { loadSiteMessages } from '@/i18n/messages';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

import type { ReactNode } from 'react';

export default async function KangurLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const messages = await loadSiteMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync locale={locale} />
      <KangurAppearanceLayout>{children}</KangurAppearanceLayout>
    </NextIntlClientProvider>
  );
}
