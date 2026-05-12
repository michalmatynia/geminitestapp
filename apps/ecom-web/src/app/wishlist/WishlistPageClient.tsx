/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, max-lines-per-function */
'use client';

import { useState, useEffect, useCallback, type JSX } from 'react';
import { useWishlist, type WishlistItem } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductImage } from '@/components/ProductImage';
import type { WishlistContent } from '@/data/wishlistContent';
import type { Product } from '@/data/products';
import { productCountWord, savedProductStateWord, formatPrice } from '@/lib/locales';

// Merge fresh DB data into a wishlist item, keeping stored data as fallback.
function mergeWithFresh(item: WishlistItem, fresh: Product): WishlistItem {
  return {
    ...item,
    name: fresh.name || item.name,
    category: fresh.category || item.category,
    price: fresh.price,
    priceDisplay: fresh.priceDisplay || item.priceDisplay,
    gradient: fresh.gradient || item.gradient,
    imageUrl: fresh.imageUrl ?? item.imageUrl,
  };
}

export function WishlistPageClient({ content }: { content: WishlistContent }): JSX.Element {
  const { items, remove, total } = useWishlist();
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();

  // Fresh product data fetched from API; keyed by productId.
  const [freshData, setFreshData] = useState<Record<string, Product>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((i) => i.productId).join(',');
    setIsRefreshing(true);
    fetch(`/api/products?ids=${encodeURIComponent(ids)}&locale=${locale}`)
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        const map: Record<string, Product> = {};
        for (const p of data.products ?? []) map[p.id] = p;
        setFreshData(map);
      })
      .catch(() => { /* keep stored data */ })
      .finally(() => setIsRefreshing(false));
  // Only re-fetch when the set of IDs changes, not on every render.
  }, [items.map((i) => i.productId).join(','), locale]);

  const getItem = useCallback(
    (item: WishlistItem): WishlistItem =>
      freshData[item.productId] ? mergeWithFresh(item, freshData[item.productId]) : item,
    [freshData],
  );

  const handleMoveToCart = useCallback((productId: string) => {
    const stored = items.find((entry) => entry.productId === productId);
    if (!stored) return;
    const item = freshData[productId] ? mergeWithFresh(stored, freshData[productId]) : stored;
    addItem({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      category: item.category,
      price: item.price ?? 0,
      priceDisplay: item.priceDisplay,
      size: '',
      gradient: item.gradient,
      imageUrl: item.imageUrl,
      quantity: 1,
    });
    remove(productId);
    toast({ type: 'success', title: content.movedToastTitle, message: item.name });
    openCart();
  }, [items, freshData, addItem, remove, toast, openCart, content.movedToastTitle]);

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>
        {/* Header */}
        <div
          className='px-8 md:px-16 py-16 md:py-24 relative overflow-hidden'
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Decorative background number */}
          <div
            className='absolute inset-0 flex items-center justify-end pr-16 pointer-events-none select-none'
            aria-hidden='true'
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(6rem, 18vw, 18rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px var(--border)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {total}
            </span>
          </div>

          <div className='relative z-10'>
            <div className='type-label mb-4' style={{ color: 'var(--accent)' }}>
              {content.heroEyebrow}
            </div>
            <h1 className='type-display-lg' style={{ color: 'var(--fg)' }}>
              {content.heroTitle}
            </h1>
            {total > 0 && (
              <div className='flex items-center gap-3 mt-2'>
                <p className='type-label' style={{ color: 'var(--muted)' }}>
                  {total} {productCountWord(total, locale, content.pieceSingular, content.piecePlural)} {savedProductStateWord(total, locale, content.savedLabel)}
                </p>
                {isRefreshing && (
                  <span className='type-label' style={{ color: 'var(--accent)' }}>
                    {content.refreshingLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {total === 0 ? (
          /* Empty state */
          <div className='flex flex-col items-center justify-center py-32 px-8 text-center gap-6'>
            <div
              className='w-20 h-20 rounded-full flex items-center justify-center'
              style={{ border: '1px solid var(--border)' }}
            >
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1' strokeLinecap='round' style={{ color: 'rgba(var(--accent-rgb),0.3)' }}>
                <path d='M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}
              >
                {content.emptyTitle}
              </p>
              <p className='type-label' style={{ color: 'var(--muted)' }}>
                {content.emptyBody}
              </p>
            </div>
            <a href={localizedHref(content.emptyCtaHref)} className='btn-primary mt-2'>{content.emptyCtaLabel}</a>
          </div>
        ) : (
          <div className='px-8 md:px-16 py-12 max-w-screen-2xl mx-auto'>
            {/* Actions bar */}
            <div className='flex items-center justify-between mb-8'>
              <p className='type-label' style={{ color: 'var(--muted)' }}>
                {Object.keys(freshData).length > 0
                  ? content.currentCatalogLabel
                  : content.savedItemsLabel}
              </p>
              <button
                className='btn-ghost'
                onClick={() => items.forEach((item) => handleMoveToCart(item.productId))}
              >
                {content.moveAllLabel}
              </button>
            </div>

            {/* Items grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8'>
              {items.map((storedItem) => {
                const item = getItem(storedItem);
                const hasFresh = Boolean(freshData[item.productId]);

                return (
                  <div key={item.productId} className='group'>
                    {/* Image */}
                    <a
                      href={localizedHref(`/products/${item.slug}`)}
                      className='block relative overflow-hidden mb-4'
                      style={{ aspectRatio: '3/4' }}
                    >
                      <ProductImage
                        imageUrl={item.imageUrl}
                        gradient={item.gradient}
                        alt={item.name}
                        className='absolute inset-0 transition-transform duration-700 group-hover:scale-105'
                        sizes='(max-width: 768px) 50vw, 25vw'
                      />
                      {/* Grain */}
                      <div
                        className='absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none'
                        style={{
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.08\'/%3E%3C/svg%3E")',
                          backgroundSize: '150px',
                        }}
                      />
                      {/* Remove */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          remove(item.productId);
                          toast({ type: 'info', title: content.removedToastTitle, message: item.name });
                        }}
                        aria-label={`${content.removeItemAriaPrefix} ${item.name} ${content.removeItemAriaSuffix}`.trim()}
                        className='absolute top-3 right-3 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                      >
                        <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' style={{ color: 'var(--muted)' }}>
                          <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                      </button>
                      {/* Move to bag on hover */}
                      <div className='absolute bottom-0 left-0 right-0 p-3 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100'>
                        <button
                          className='btn-primary w-full justify-center text-center'
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)' }}
                          onClick={(e) => { e.preventDefault(); handleMoveToCart(item.productId); }}
                        >
                          {content.moveToBagLabel}
                        </button>
                      </div>
                    </a>

                    {/* Info */}
                    <div className='type-label mb-1' style={{ color: 'var(--muted)' }}>{item.category}</div>
                    <a
                      href={localizedHref(`/products/${item.slug}`)}
                      style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, color: 'var(--fg)', display: 'block', marginBottom: '0.25rem' }}
                    >
                      {item.name}
                    </a>
                    <div className='flex items-center gap-2'>
                      <span className='type-price' style={{ color: 'var(--muted)' }}>{formatPrice(item.price ?? 0, locale)}</span>
                      {hasFresh && (
                        <span
                          className='type-label px-1.5 py-0.5'
                          style={{ fontSize: '0.6rem', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                        >
                          {content.liveBadgeLabel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
