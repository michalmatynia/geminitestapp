'use client';

import { useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useQuickView } from '@/context/QuickViewContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { ProductImage } from '@/components/ProductImage';
import { HOME_CONTENT_DEFAULTS, type HomeFeaturedContent } from '@/data/homeContent';
import { formatPrice } from '@/lib/locales';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';

const FEATURED_SLUGS = [
  'amphora-vessel',
  'linen-overshirt',
  'cognac-tote',
  'obsidian-coat',
  'marble-dish-set',
  'sand-wool-scarf',
];

const STATIC_FEATURED = FEATURED_SLUGS
  .map((slug) => PRODUCTS.find((p) => p.slug === slug))
  .filter((p): p is Product => Boolean(p));

function ProductCard({ product, quickAddLabel }: { product: Product; quickAddLabel: string }): JSX.Element {
  const { addItem } = useCart();
  const { open } = useQuickView();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const aspect = '4/5';
  const isNewTag = product.tag === 'New' || product.tag === 'Nowość';
  const quickViewLabel = locale === 'pl' ? 'Szybki podgląd' : 'Quick view';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      size: product.sizes[1] ?? '',
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    open(product);
  };

  return (
    <a
      href={localizedHref(`/products/${product.slug}`)}
      className="product-card block relative"
      style={{ aspectRatio: aspect }}
    >
      {/* Image */}
      <ProductImage
        imageUrl={product.imageUrl}
        gradient={product.gradient}
        alt={product.name}
        sizes="(max-width: 768px) 50vw, 25vw"
        className="card-image absolute inset-0"
        position="top"
      />

      {/* Hover overlay */}
      <div className="card-overlay" />

      {/* Tag badge */}
      {product.tag && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className="type-label px-2 py-1 inline-block"
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

      {/* Static info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 flex justify-between items-end z-10"
        style={{ background: 'var(--media-overlay)' }}
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="type-label mb-0.5 truncate" style={{ color: 'var(--on-media-muted)' }}>
            {product.category}
          </div>
          <div
            className="truncate"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--on-media)',
              lineHeight: 1.1,
            }}
          >
            {product.name}
          </div>
        </div>
        <span
          className="type-price flex-shrink-0"
          style={{ color: 'var(--soft-gold)', textShadow: '0 0 10px rgba(var(--gold-rgb),0.35)' }}
        >
          {formatPrice(product.price, locale)}
        </span>
      </div>

      {/* Hover: Quick Add + Quick View */}
      <div className="card-info-hover z-20">
        <div className="flex gap-2">
          <button
            className="flex-1 btn-primary text-center justify-center"
            style={{ padding: '0.6rem 1rem', fontSize: '0.6rem' }}
            onClick={handleQuickAdd}
          >
            {quickAddLabel}
          </button>
          <button
            className="btn-ghost flex-shrink-0 px-3 py-0"
            style={{ padding: '0.6rem 0.8rem', borderColor: 'rgba(var(--accent-rgb),0.3)', color: 'var(--accent)', fontSize: '0.6rem' }}
            onClick={handleQuickView}
            aria-label={quickViewLabel}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </a>
  );
}

export function FeaturedProducts({
  products: dbProducts,
  content = HOME_CONTENT_DEFAULTS.featured,
}: {
  products?: Product[] | null;
  content?: HomeFeaturedContent;
}): JSX.Element {
  const featured = dbProducts && dbProducts.length > 0 ? dbProducts : STATIC_FEATURED;
  const isLive = dbProducts && dbProducts.length > 0;
  const localizedHref = useLocalizedHref();
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    /* Section header */
    gsap.fromTo('.feat-header',
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: '.feat-header', start: 'top 88%', toggleActions: 'play none none none' },
      });

    /* Product cards stagger */
    ScrollTrigger.batch('.feat-card', {
      start: 'top 92%',
      onEnter: (batch) => {
        gsap.fromTo(batch,
          { opacity: 0, y: 70, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'expo.out', stagger: 0.09 });
      },
    });

    /* CTA button */
    gsap.fromTo('.feat-cta',
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.8, ease: 'expo.out',
        scrollTrigger: { trigger: '.feat-cta', start: 'top 92%', toggleActions: 'play none none none' },
      });
  }, { scope: sectionRef, dependencies: [] });

  return (
    <section ref={sectionRef} className="px-6 md:px-10 pb-16 md:pb-20 max-w-screen-2xl mx-auto">
      {/* Section header */}
      <div className="feat-header flex items-end justify-between mb-12" style={{ opacity: 0 }}>
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            {isLive ? content.liveEyebrow : content.fallbackEyebrow}
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            {content.title}
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {content.filters.map((f, i) => (
            <button
              key={f}
              className="type-label px-4 py-2 transition-all duration-200"
              style={{
                background: i === 0 ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                color: i === 0 ? 'var(--accent)' : 'var(--muted-teal)',
                border: `1px solid ${i === 0 ? 'rgba(var(--accent-rgb),0.4)' : 'rgba(var(--accent-rgb),0.1)'}`,
                boxShadow: i === 0 ? '0 0 8px rgba(var(--accent-rgb),0.12)' : 'none',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {featured.map((product) => (
          <div key={product.id} className="feat-card" style={{ opacity: 0 }}>
            <ProductCard product={product} quickAddLabel={content.quickAddLabel} />
          </div>
        ))}
      </div>

      {/* View all CTA */}
      <div className="feat-cta flex justify-center mt-10" style={{ opacity: 0 }}>
        <a href={localizedHref(content.ctaHref)} className="btn-primary px-16">
          {isLive ? content.ctaLiveLabel : content.ctaFallbackLabel}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
