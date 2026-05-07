import type { Metadata } from 'next';
import type { JSX } from 'react';
import { WishlistPageClient } from '@/app/wishlist/WishlistPageClient';
import { getWishlistContent } from '@/lib/cms';

export const metadata: Metadata = {
  title: 'Wishlist - ARCANA',
  description: 'Review your saved ARCANA collectibles and move them to your bag.',
};

export default async function WishlistPage(): Promise<JSX.Element> {
  const content = await getWishlistContent();
  return <WishlistPageClient content={content} />;
}
