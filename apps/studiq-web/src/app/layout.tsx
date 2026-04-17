import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';

import { StudiqQueryProvider } from '@/providers/QueryProvider';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { loadSiteMessages } from '@/i18n/messages';

import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import './globals.css';
import './kangur/kangur.css';

export const metadata: Metadata = {
  title: 'StudiQ',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const locale = DEFAULT_SITE_I18N_CONFIG.defaultLocale;
  const messages = await loadSiteMessages(locale);

  return (
    <html lang={locale} className='kangur-surface-active'>
      <body className='kangur-surface-active'>
        <Suspense fallback={<div className='min-h-screen' aria-busy='true' />}>
          <StudiqQueryProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <main id='kangur-main-content'>{children}</main>
            </NextIntlClientProvider>
          </StudiqQueryProvider>
        </Suspense>
      </body>
    </html>
  );
}
