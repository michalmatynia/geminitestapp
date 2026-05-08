import type { Metadata } from 'next';
import type { JSX } from 'react';
import { WishlistPageClient } from '@/app/wishlist/WishlistPageClient';
import { getWishlistContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getWishlistContent(locale);
  return {
    title: `${content.heroTitle} - ARCANA`,
    description: locale === 'pl'
      ? 'Przejrzyj zapisane produkty ARCANA i przenieś je do koszyka.'
      : 'Review your saved ARCANA collectibles and move them to your bag.',
  };
}

export default async function WishlistPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getWishlistContent(locale);
  return <WishlistPageClient content={content} />;
}
