'use client';

import type { JSX } from 'react';
import { useCart } from '@/context/CartContext';

const PRODUCTS = [
  {
    id: '001',
    slug: 'amphora-vessel',
    name: 'Amphora Vessel',
    category: 'Objects',
    price: 680,
    priceDisplay: '€ 680',
    sizes: [],
    tag: 'New',
    gradient: 'linear-gradient(155deg, #D4C5B5 0%, #A89282 50%, #8C7868 100%)',
    span: 'col-span-1 row-span-2',
    aspect: '2/3',
  },
  {
    id: '002',
    slug: 'linen-overshirt',
    name: 'Linen Overshirt',
    category: 'Womenswear',
    price: 320,
    priceDisplay: '€ 320',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tag: null,
    gradient: 'linear-gradient(155deg, #E8DFCF 0%, #CEC0AD 100%)',
    span: 'col-span-1',
    aspect: '3/4',
  },
  {
    id: '003',
    slug: 'cognac-tote',
    name: 'Cognac Tote',
    category: 'Accessories',
    price: 490,
    priceDisplay: '€ 490',
    sizes: [],
    tag: 'Last pieces',
    gradient: 'linear-gradient(155deg, #7A4B28 0%, #5A3318 100%)',
    span: 'col-span-1',
    aspect: '3/4',
  },
  {
    id: '004',
    slug: 'obsidian-coat',
    name: 'Obsidian Coat',
    category: 'Menswear',
    price: 1240,
    priceDisplay: '€ 1,240',
    sizes: ['44', '46', '48', '50', '52', '54'],
    tag: 'Limited',
    gradient: 'linear-gradient(155deg, #2A2522 0%, #1A1612 100%)',
    span: 'col-span-1 row-span-2',
    aspect: '2/3',
  },
  {
    id: '005',
    slug: 'marble-dish-set',
    name: 'Marble Dish Set',
    category: 'Objects',
    price: 180,
    priceDisplay: '€ 180',
    sizes: [],
    tag: null,
    gradient: 'linear-gradient(155deg, #D0CAC4 0%, #B0A89E 100%)',
    span: 'col-span-1',
    aspect: '3/4',
  },
  {
    id: '006',
    slug: 'sand-wool-scarf',
    name: 'Sand Wool Scarf',
    category: 'Accessories',
    price: 145,
    priceDisplay: '€ 145',
    sizes: [],
    tag: 'New',
    gradient: 'linear-gradient(155deg, #D9C9A8 0%, #BFA880 100%)',
    span: 'col-span-1',
    aspect: '3/4',
  },
];

function ProductCard({ product }: { product: typeof PRODUCTS[0] }): JSX.Element {
  const { addItem } = useCart();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      size: product.sizes?.[1] ?? '',
      gradient: product.gradient,
      quantity: 1,
    });
  };

  return (
    <a href={`/products/${product.slug}`} className="product-card block relative" style={{ aspectRatio: product.aspect }}>
      {/* Image area */}
      <div
        className="card-image absolute inset-0"
        style={{ background: product.gradient }}
      />

      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: '150px',
        }}
      />

      {/* Hover gradient overlay */}
      <div className="card-overlay" />

      {/* Tag */}
      {product.tag && (
        <div className="absolute top-4 left-4 z-10">
          <span
            className="type-label px-2.5 py-1 inline-block"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {product.tag}
          </span>
        </div>
      )}

      {/* Static info (always visible, bottom) */}
      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-4 flex justify-between items-end z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.18) 0%, transparent 100%)' }}
      >
        <div>
          <div className="type-label mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {product.category}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 300,
              color: '#fff',
              lineHeight: 1,
            }}
          >
            {product.name}
          </div>
        </div>
        <span className="type-price text-white/80">{product.priceDisplay}</span>
      </div>

      {/* Hover: Quick add button */}
      <div className="card-info-hover z-20">
        <button
          className="w-full btn-primary text-center justify-center"
          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)' }}
          onClick={handleQuickAdd}
        >
          Quick Add
        </button>
      </div>
    </a>
  );
}

export function FeaturedProducts(): JSX.Element {
  return (
    <section className="px-6 md:px-10 pb-24 max-w-screen-2xl mx-auto">
      {/* Section header */}
      <div className="flex items-end justify-between mb-12">
        <div>
          <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
            Curated Selection
          </div>
          <h2 className="type-display-lg" style={{ color: 'var(--fg)' }}>
            The Edit
          </h2>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {/* Filter pills */}
          {['All', 'Objects', 'Womenswear', 'Menswear'].map((f, i) => (
            <button
              key={f}
              className="type-label px-4 py-2 transition-all duration-200"
              style={{
                background: i === 0 ? 'var(--fg)' : 'transparent',
                color: i === 0 ? 'var(--bg)' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid — editorial layout with varying row spans */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-min">
        {PRODUCTS.map((product) => (
          <div key={product.id} className={product.span}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Load more */}
      <div className="flex justify-center mt-14">
        <button className="btn-ghost px-16">
          View All Objects
        </button>
      </div>
    </section>
  );
}
