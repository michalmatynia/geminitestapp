import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import { Exo_2, Barlow, IBM_Plex_Mono } from 'next/font/google';
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
import { LocaleProvider } from '@/context/LocaleContext';
import { getSiteContent } from '@/lib/cms';
import { getMentiosCatalogLocales } from '@/lib/mentios';
import { getRequestLocale, getRequestLocaleState } from '@/lib/request-locale';

import './globals.css';

const exo2 = Exo_2({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const barlow = Barlow({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  if (locale === 'pl') {
    return {
      title: 'ARCANA - Anime, gaming i filmowe kolekcjonalia',
      description: 'Breloki, piny i biżuteria z ulubionych uniwersów. Kolekcjonalia anime, gamingowe i filmowe - licencjonowane i starannie wybrane.',
    };
  }
  return {
    title: 'ARCANA - Anime, Gaming, and Film Collectibles',
    description: 'Keychains, pins and jewellery from the universes you love. Anime, gaming and film collectibles - officially licensed, obsessively curated.',
  };
}

export default async function RootLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const { locale, pathname, search } = await getRequestLocaleState();
  const [siteContent, availableLocales] = await Promise.all([
    getSiteContent(locale),
    getMentiosCatalogLocales(),
  ]);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-theme="nightly"
      className={`nightly dark ${exo2.variable} ${barlow.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <LocaleProvider locale={locale} pathname={pathname} search={search} availableLocales={availableLocales}>
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
        </LocaleProvider>
      </body>
    </html>
  );
}
