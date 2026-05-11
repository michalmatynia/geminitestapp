import type { Metadata } from 'next';
import type { JSX } from 'react';
import { WishlistPageClient } from '@/app/wishlist/WishlistPageClient';
import { getWishlistContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getWishlistContent(locale);
  return {
    title: `${content.heroTitle} - STARGATER`,
    description: locale === 'pl'
      ? 'Przejrzyj zapisane produkty STARGATER i przenieś je do koszyka.'
      : 'Review your saved STARGATER collectibles and move them to your bag.',
    robots: { index: false, follow: false },
  };
}

export default async function WishlistPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getWishlistContent(locale);
  return <WishlistPageClient content={content} />;
}
