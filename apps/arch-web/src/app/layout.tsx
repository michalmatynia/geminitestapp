import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/en';
  const localeMatch = /^\/(en|de|pl)/.exec(pathname);
  const lang = localeMatch?.[1] ?? 'en';

  return (
    <html lang={lang} className={`${cormorant.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
