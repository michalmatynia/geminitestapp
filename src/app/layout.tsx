import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { RootClientShell } from './_providers/RootClientShell';
import { cn } from '@/shared/utils';
import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';

import type { Metadata, Viewport } from 'next';

import './fonts.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'StudiQ',
    template: '%s | StudiQ',
  },
  description: 'StudiQ admin workspace and storefront.',
  applicationName: 'StudiQ',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  const commonTranslations = await getTranslations('Common');

  return (
    <html lang={DEFAULT_SITE_I18N_CONFIG.defaultLocale} suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        <NextIntlClientProvider>
          <a href='#app-content' className='app-skip-link'>
            {commonTranslations('skipToMainContent')}
          </a>
          <RootClientShell>{children}</RootClientShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
