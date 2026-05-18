import { NextIntlClientProvider } from 'next-intl';
import { connection } from 'next/server';

import KangurAppearanceLayout from './KangurAppearanceLayout';
import { getCachedKangurAuthBootstrapScript } from '@/features/kangur/server/auth-bootstrap';
import { loadKangurSiteMessages } from '@/i18n/messages';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { HtmlLangSync } from '@/shared/ui/HtmlLangSync';

import type { ReactNode } from 'react';

export default async function KangurLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const [messages] = await Promise.all([
    loadKangurSiteMessages(locale),
    connection(),
  ]);

  // Prewarm auth so it overlaps with KangurAppearanceLayout's async work.
  // KangurAppLayout will reuse this via React cache() — no duplicate DB calls.
  void getCachedKangurAuthBootstrapScript();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync locale={locale} />
      <KangurAppearanceLayout>{children}</KangurAppearanceLayout>
    </NextIntlClientProvider>
  );
}
