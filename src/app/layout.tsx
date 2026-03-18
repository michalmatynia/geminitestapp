import { Analytics } from '@vercel/analytics/next';
import { RootClientShell } from './_providers/RootClientShell';
import { cn } from '@/shared/utils';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning className={cn('max-w-full overflow-x-hidden font-sans')}>
        <a href='#app-content' className='app-skip-link'>
          Skip to main content
        </a>
        <RootClientShell>{children}</RootClientShell>
        <Analytics />
      </body>
    </html>
  );
}
