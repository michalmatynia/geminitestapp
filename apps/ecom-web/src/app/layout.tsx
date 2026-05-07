import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import { Exo_2, Rajdhani, Share_Tech_Mono } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider, ToastContainer } from '@/context/ToastContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { RecentlyViewedProvider } from '@/context/RecentlyViewedContext';
import { QuickViewProvider } from '@/context/QuickViewContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartDrawer } from '@/components/CartDrawer';
import { BackToTop } from '@/components/BackToTop';
import { QuickViewModal } from '@/components/QuickViewModal';
import { CookieConsent } from '@/components/CookieConsent';
import { SiteContentProvider } from '@/context/SiteContentContext';
import { getSiteContent } from '@/lib/cms';

import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

const themeInitScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem('arcana-theme');
    const theme = storedTheme === 'daily' ? 'daily' : 'nightly';
    const root = document.documentElement;
    root.classList.remove('daily', 'nightly', 'dark');
    root.classList.add(theme);
    if (theme === 'nightly') root.classList.add('dark');
    root.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = 'nightly';
  }
})();
`;

export const metadata: Metadata = {
  title: 'ARCANA — Anime · Gaming · Film Collectibles',
  description: 'Keychains, pins and jewellery from the universes you love. Anime, gaming and film collectibles — officially licensed, obsessively curated.',
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const siteContent = await getSiteContent();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="nightly"
      className={`nightly dark ${exo2.variable} ${rajdhani.variable} ${shareTechMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteContentProvider content={siteContent}>
          <ToastProvider>
            <AuthProvider>
            <WishlistProvider>
              <RecentlyViewedProvider>
              <QuickViewProvider>
              <CartProvider>
                {children}
                <CartDrawer />
                <ToastContainer />
                <BackToTop />
                <QuickViewModal />
                <CookieConsent />
              </CartProvider>
              </QuickViewProvider>
              </RecentlyViewedProvider>
            </WishlistProvider>
            </AuthProvider>
          </ToastProvider>
        </SiteContentProvider>
      </body>
    </html>
  );
}
