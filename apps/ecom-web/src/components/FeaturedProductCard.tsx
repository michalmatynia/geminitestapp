/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/strict-boolean-expressions,complexity,max-lines-per-function */
'use client';

import type { JSX } from 'react';
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import type { Product } from '@/data/products';
import { ProductImage } from '@/components/ProductImage';
import { formatPrice } from '@/lib/locales';

function StarIcon({ filled, size = 13 }: { filled: boolean; size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill={filled ? 'currentColor' : 'none'}
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <polygon points='12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26' />
    </svg>
  );
}

export function FeaturedProductCard({
  product,
  quickAddLabel,
  priority = false,
}: {
  product: Product;
  quickAddLabel: string;
  priority?: boolean;
}): JSX.Element {
  const { addItem } = useCart();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const { user } = useAuth();
  const { isWishlisted, toggle, getCount, requestCount } = useWishlist();

  const isNewTag = product.tag === 'New' || product.tag === 'Nowość';
  const secondaryImageUrl = product.imageUrls?.[1]?.trim();
  const hasSecondaryImage = secondaryImageUrl !== undefined && secondaryImageUrl.length > 0 && secondaryImageUrl !== product.imageUrl;
  const wishlisted = isWishlisted(product.id);
  const count = getCount(product.id);

  useEffect(() => { requestCount(product.id); }, [product.id, requestCount]);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      currencyCode: product.currencyCode,
      size: product.sizes[1] ?? '',
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    toggle({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      currencyCode: product.currencyCode,
      gradient: product.gradient,
      imageUrl: product.imageUrl,
    });
  };

  return (
    <a
      href={localizedHref(`/products/${product.slug}`)}
      className='product-card group block'
    >
      <div className='relative overflow-hidden' style={{ aspectRatio: '1/1' }}>
        <ProductImage
          imageUrl={product.imageUrl}
          gradient={product.gradient}
          alt={product.shortName ?? product.name}
          sizes='(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 12.5vw'
          className='card-image absolute inset-0'
          fit='cover'
          position='center'
          priority={priority}
        />
        {hasSecondaryImage && (
          <ProductImage
            imageUrl={secondaryImageUrl}
            gradient={product.gradientAlt ?? product.gradient}
            alt={product.shortName ?? product.name}
            sizes='(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 12.5vw'
            className='absolute inset-0 transition-opacity duration-700 ease-in-out opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            fit='cover'
            position='center'
            quality={72}
          />
        )}
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/3 bg-gradient-to-t from-black/65 via-black/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100'
        />

        {product.tag && (
          <div className='absolute top-3 left-3 z-10'>
            <span
              className='type-label px-2 py-1 inline-block'
              style={{
                background: isNewTag ? 'rgba(var(--accent-rgb),0.15)' : 'rgba(var(--coral-rgb),0.15)',
                color: isNewTag ? 'var(--accent)' : 'var(--coral-red)',
                border: `1px solid ${isNewTag ? 'rgba(var(--accent-rgb),0.4)' : 'rgba(var(--coral-rgb),0.4)'}`,
              }}
            >
              {product.tag}
            </span>
          </div>
        )}

        {/* Wishlist star — only for logged-in users */}
        {user && (
          <button
            onClick={handleToggleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className='absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100'
            style={{
              background: 'rgba(4,3,20,0.65)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: wishlisted ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
            }}
          >
            <StarIcon filled={wishlisted} size={12} />
          </button>
        )}

        <div
          className='absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out'
          style={{ background: 'rgba(4,3,20,0.82)', backdropFilter: 'blur(6px)' }}
        >
          <button
            className='w-full py-3 transition-colors hover:bg-[rgba(255,255,255,0.06)]'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
            }}
            onClick={handleQuickAdd}
          >
            {quickAddLabel}
          </button>
        </div>
      </div>

      <div className='mt-2.5 px-1'>
        <div className='type-label mb-1' style={{ color: 'rgba(255,255,255,0.45)' }}>
          {product.category}
        </div>
        {product.lore && (
          <div className='mb-1.5'>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(180,160,255,0.8)',
                border: '1px solid rgba(140,100,255,0.28)',
                padding: '0.1rem 0.4rem',
              }}
            >
              {product.lore}
            </span>
          </div>
        )}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9rem',
            fontWeight: 400,
            color: 'var(--fg)',
            lineHeight: 1.25,
            marginBottom: '0.3rem',
          }}
        >
          {product.shortName ?? product.name}
        </div>
        <div className='flex items-center gap-2'>
          <span
            className='type-price'
            style={{ color: 'var(--soft-gold)', textShadow: '0 0 10px rgba(var(--gold-rgb),0.4)' }}
          >
            {formatPrice(product.price, locale, product.currencyCode)}
          </span>
          {count > 0 && (
            <span
              className='flex items-center gap-0.5'
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--muted)', letterSpacing: '0.04em' }}
            >
              <StarIcon filled={false} size={9} />
              {count}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
