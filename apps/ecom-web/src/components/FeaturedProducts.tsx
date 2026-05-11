'use client';

import { useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { ProductImage } from '@/components/ProductImage';
import { HOME_CONTENT_DEFAULTS, type HomeFeaturedContent } from '@/data/homeContent';
import { formatPrice } from '@/lib/locales';
import { gsap, useGSAP } from '@/lib/gsap';

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

function ProductCard({ product, quickAddLabel, priority = false }: { product: Product; quickAddLabel: string; priority?: boolean }): JSX.Element {
  const { addItem } = useCart();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const aspect = '1/1';
  const isNewTag = product.tag === 'New' || product.tag === 'Nowość';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      size: product.sizes[1] ?? '',
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
  };

  return (
    <a
      href={localizedHref(`/products/${product.slug}`)}
      className="product-card group block"
    >
      {/* Image box — overflow-hidden clips both images and the slide-up panel */}
      <div className="relative overflow-hidden" style={{ aspectRatio: aspect }}>
        {/* Primary image */}
        <ProductImage
          imageUrl={product.imageUrl}
          gradient={product.gradient}
          alt={product.shortName ?? product.name}
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 12.5vw"
          className="card-image absolute inset-0"
          fit="cover"
          position="center"
          priority={priority}
        />
        {/* Secondary image — crossfades in on hover */}
        <ProductImage
          imageUrl={product.imageUrls?.[1] ?? product.imageUrl}
          gradient={product.gradientAlt ?? product.gradient}
          alt={product.shortName ?? product.name}
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 12.5vw"
          className="absolute inset-0 transition-opacity duration-700 ease-in-out opacity-0 group-hover:opacity-100"
          fit="cover"
          position="center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-2/3 bg-gradient-to-t from-black/65 via-black/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100"
        />

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

        {/* Quick add — hidden below the image edge, slides up on group hover */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
          style={{ background: 'rgba(4,3,20,0.82)', backdropFilter: 'blur(6px)' }}
        >
          <button
            className="w-full py-3 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
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

      {/* Text block — below the image */}
      <div className="mt-2.5 px-1">
        <div
          className="type-label mb-1"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {product.category}
        </div>
        {product.lore && (
          <div className="mb-1.5">
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
        <span
          className="type-price"
          style={{ color: 'var(--soft-gold)', textShadow: '0 0 10px rgba(var(--gold-rgb),0.4)' }}
        >
          {formatPrice(product.price, locale)}
        </span>
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
      { y: 40 },
      {
        y: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: '.feat-header', start: 'top 88%', toggleActions: 'play none none none' },
      });

    /* Product grid */
    gsap.fromTo('.feat-grid',
      { y: 52, scale: 0.985 },
      {
        y: 0, scale: 1, duration: 1.15, ease: 'power3.out', force3D: true,
        clearProps: 'transform',
        scrollTrigger: { trigger: '.feat-grid', start: 'top 92%', toggleActions: 'play none none none' },
      });

    /* CTA button */
    gsap.fromTo('.feat-cta',
      { y: 24 },
      {
        y: 0, duration: 0.8, ease: 'expo.out',
        scrollTrigger: { trigger: '.feat-cta', start: 'top 92%', toggleActions: 'play none none none' },
      });
  }, { scope: sectionRef, dependencies: [] });

  return (
    <section ref={sectionRef} className="relative isolate px-6 md:px-10 pb-16 md:pb-20 max-w-screen-2xl mx-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-56 bg-gradient-to-t from-black/70 via-black/25 to-transparent"
      />

      {/* Section header */}
      <div className="feat-header relative z-10 flex items-end justify-between mb-12">
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
      <div className="feat-grid relative z-10 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4">
        {featured.map((product, index) => (
          <div key={product.id} className="feat-card">
            <ProductCard product={product} quickAddLabel={content.quickAddLabel} priority={index < 8} />
          </div>
        ))}
      </div>

      {/* View all CTA */}
      <div className="feat-cta relative z-30 flex justify-center mt-10">
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
