'use client';

import type { JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useQuickView } from '@/context/QuickViewContext';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { ProductImage } from '@/components/ProductImage';

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

function ProductCard({ product }: { product: Product }): JSX.Element {
  const { addItem } = useCart();
  const { open } = useQuickView();
  const aspect = '3/4';

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
      href={`/products/${product.slug}`}
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
      />

      {/* Hover overlay */}
      <div className="card-overlay" />

      {/* Tag badge */}
      {product.tag && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className="type-label px-2 py-1 inline-block"
            style={{
              background: product.tag === 'New' ? 'rgba(171,217,208,0.15)' : 'rgba(210,116,102,0.15)',
              color: product.tag === 'New' ? 'var(--cyan-teal)' : 'var(--coral-red)',
              border: `1px solid ${product.tag === 'New' ? 'rgba(171,217,208,0.4)' : 'rgba(210,116,102,0.4)'}`,
            }}
          >
            {product.tag}
          </span>
        </div>
      )}

      {/* Static info bar */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 flex justify-between items-end z-10"
        style={{ background: 'linear-gradient(to top, rgba(1,0,13,0.85) 0%, transparent 100%)' }}
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="type-label mb-0.5 truncate" style={{ color: 'rgba(171,217,208,0.55)' }}>
            {product.category}
          </div>
          <div
            className="truncate"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--cream-highlight)',
              lineHeight: 1.1,
            }}
          >
            {product.name}
          </div>
        </div>
        <span
          className="type-price flex-shrink-0"
          style={{ color: 'var(--soft-gold)', textShadow: '0 0 10px rgba(250,229,163,0.35)' }}
        >
          {product.priceDisplay}
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
            Add to Bag
          </button>
          <button
            className="btn-ghost flex-shrink-0 px-3 py-0"
            style={{ padding: '0.6rem 0.8rem', borderColor: 'rgba(171,217,208,0.3)', color: 'var(--cyan-teal)', fontSize: '0.6rem' }}
            onClick={handleQuickView}
            aria-label="Quick view"
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

export function FeaturedProducts({ products: dbProducts }: { products?: Product[] | null }): JSX.Element {
  const featured = dbProducts && dbProducts.length > 0 ? dbProducts : STATIC_FEATURED;
  const isLive = dbProducts && dbProducts.length > 0;

  return (
    <section className="px-6 md:px-10 pb-24 max-w-screen-2xl mx-auto">
      {/* Section header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--cyan-teal)' }}>
            {isLive ? 'Live Catalog' : 'Featured Items'}
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            Fresh Drops
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {['All', 'Anime', 'Gaming', 'Film'].map((f, i) => (
            <button
              key={f}
              className="type-label px-4 py-2 transition-all duration-200"
              style={{
                background: i === 0 ? 'rgba(171,217,208,0.12)' : 'transparent',
                color: i === 0 ? 'var(--cyan-teal)' : 'var(--muted-teal)',
                border: `1px solid ${i === 0 ? 'rgba(171,217,208,0.4)' : 'rgba(171,217,208,0.1)'}`,
                boxShadow: i === 0 ? '0 0 8px rgba(171,217,208,0.12)' : 'none',
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
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* View all CTA */}
      <div className="flex justify-center mt-14">
        <a href="/products" className="btn-primary px-16">
          View All {isLive ? '1,800+ Items' : 'Items'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </section>
  );
}
