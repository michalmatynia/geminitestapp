import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';
import { Cormorant_SC, Jost, Courier_Prime } from 'next/font/google';
import { CartProvider } from '@/context/CartContext';
import { ToastProvider, ToastContainer } from '@/context/ToastContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { CartDrawer } from '@/components/CartDrawer';
import { BackToTop } from '@/components/BackToTop';

import './globals.css';

const cormorantSC = Cormorant_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-display',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ARCANA — Objects of Enduring Beauty',
  description: 'A curated collection of luxury goods made to last a lifetime.',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorantSC.variable} ${jost.variable} ${courierPrime.variable}`}
    >
      <body>
        <ToastProvider>
          <WishlistProvider>
            <CartProvider>
              {children}
              <CartDrawer />
              <ToastContainer />
              <BackToTop />
            </CartProvider>
          </WishlistProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
