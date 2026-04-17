import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { StudiqQueryProvider } from '@/providers/QueryProvider';

import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import './kangur/kangur.css';

export const metadata: Metadata = {
  title: 'StudiQ',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className='kangur-surface-active'>
      <body className='kangur-surface-active'>
        <StudiqQueryProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <main id='kangur-main-content'>{children}</main>
          </NextIntlClientProvider>
        </StudiqQueryProvider>
      </body>
    </html>
  );
}
