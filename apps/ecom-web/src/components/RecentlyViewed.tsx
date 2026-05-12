/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions,max-lines-per-function */
'use client';

import { useState, useEffect, type JSX } from 'react';
import { useRecentlyViewed, type RecentlyViewedItem } from '@/context/RecentlyViewedContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import type { Product } from '@/data/products';
import { ProductImage } from '@/components/ProductImage';
import { HOME_CONTENT_DEFAULTS, type HomeRecentlyViewedContent } from '@/data/homeContent';
import { formatPrice } from '@/lib/locales';

export function RecentlyViewed({
  content = HOME_CONTENT_DEFAULTS.recentlyViewed,
}: {
  content?: HomeRecentlyViewedContent;
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

  const getItem = (item: RecentlyViewedItem) => {
    const fresh = freshData[item.productId];
    if (!fresh) return item;
    return {
      ...item,
      name: fresh.name || item.name,
      category: fresh.category || item.category,
      price: fresh.price ?? item.price,
      priceDisplay: fresh.priceDisplay || item.priceDisplay,
      gradient: fresh.gradient || item.gradient,
      imageUrl: fresh.imageUrl ?? item.imageUrl,
    };
  };

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

        <div
          className='flex gap-5 overflow-x-auto pb-2'
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((stored) => {
            const item = getItem(stored);
            return (
              <a
                key={item.productId}
                href={localizedHref(`/products/${item.slug}`)}
                className='group flex-shrink-0'
                style={{ width: '190px' }}
              >
                <div
                  className='w-full mb-4 overflow-hidden relative'
                  style={{ aspectRatio: '3/4' }}
                >
                  <ProductImage
                    imageUrl={item.imageUrl}
                    gradient={item.gradient}
                    alt={item.name}
                    className='absolute inset-0 transition-transform duration-700 group-hover:scale-105'
                    sizes='190px'
                  />
                </div>
                <div
                  className='type-label mb-1'
                  style={{ color: 'var(--muted)', fontSize: '0.65rem', letterSpacing: '0.08em' }}
                >
                  {item.category}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.95rem',
                    fontWeight: 300,
                    color: 'var(--fg)',
                    lineHeight: 1.2,
                    marginBottom: '0.3rem',
                  }}
                >
                  {item.name}
                </div>
                <div
                  className='type-price'
                  style={{ color: 'var(--muted)', fontSize: '0.78rem' }}
                >
                  {formatPrice(item.price ?? 0, locale)}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
