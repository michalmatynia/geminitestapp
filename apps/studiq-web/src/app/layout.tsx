import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

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
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main id='kangur-main-content'>{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
