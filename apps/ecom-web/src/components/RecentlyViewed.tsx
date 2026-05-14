/* eslint-disable @typescript-eslint/strict-boolean-expressions,max-lines-per-function */
'use client';

import { useState, useEffect, type JSX } from 'react';
import { useRecentlyViewed, type RecentlyViewedItem } from '@/context/RecentlyViewedContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import type { Product } from '@/data/products';
import { HOME_CONTENT_DEFAULTS, type HomeRecentlyViewedContent } from '@/data/homeContent';
import { FeaturedProductCard } from '@/components/FeaturedProductCard';

function toProduct(item: RecentlyViewedItem, fresh?: Product): Product {
  if (fresh) return fresh;
  return {
    id: item.productId,
    slug: item.slug,
    name: item.name,
    category: item.category,
    collectionSlug: '',
    price: item.price,
    priceDisplay: item.priceDisplay,
    currencyCode: item.currencyCode,
    gradient: item.gradient,
    imageUrl: item.imageUrl,
    description: '',
    details: [],
    care: [],
    sizes: [],
  };
}

export function RecentlyViewed({
  content = HOME_CONTENT_DEFAULTS.recentlyViewed,
  quickAddLabel = HOME_CONTENT_DEFAULTS.featured.quickAddLabel,
}: {
  content?: HomeRecentlyViewedContent;
  quickAddLabel?: string;
}): JSX.Element | null {
  const { items } = useRecentlyViewed();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const [freshData, setFreshData] = useState<Record<string, Product>>({});

  const idKey = items.map((i) => i.productId).join(',');

  useEffect(() => {
    if (!idKey) return;
    fetch(`/api/products?ids=${encodeURIComponent(idKey)}&locale=${locale}`)
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        const map: Record<string, Product> = {};
        for (const p of data.products ?? []) map[p.id] = p;
        setFreshData(map);
      })
      .catch(() => {});
  }, [idKey, locale]);

  if (items.length === 0) return null;

  return (
    <section
      className='px-8 md:px-16 py-16'
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div className='max-w-screen-2xl mx-auto'>
        <div className='flex items-end justify-between mb-10'>
          <div>
            <div className='type-label mb-2' style={{ color: 'var(--accent)' }}>
              {content.eyebrow}
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.6rem, 3vw, 2.5rem)',
                fontWeight: 300,
                color: 'var(--fg)',
                lineHeight: 1.1,
              }}
            >
              {content.title}
            </h2>
          </div>
          <a
            href={localizedHref(content.ctaHref)}
            className='hidden md:flex items-center gap-2 type-label transition-colors hover:text-[var(--fg)]'
            style={{ color: 'var(--muted)' }}
          >
            {content.ctaLabel}
            <svg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <path d='M5 12h14M12 5l7 7-7 7' />
            </svg>
          </a>
        </div>

        <div className='grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3'>
          {items.slice(0, 8).map((stored) => {
            const product = toProduct(stored, freshData[stored.productId]);
            return (
              <FeaturedProductCard
                key={stored.productId}
                product={product}
                quickAddLabel={quickAddLabel}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
