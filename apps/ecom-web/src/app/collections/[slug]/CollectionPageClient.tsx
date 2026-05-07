'use client';

import { useState, useMemo, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import type { Product } from '@/data/products';

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '44', '46', '48', '50', '52'];
const PRICE_RANGES = [
  { label: 'Under € 200', min: 0, max: 200 },
  { label: '€ 200 – € 500', min: 200, max: 500 },
  { label: '€ 500 – € 1,000', min: 500, max: 1000 },
  { label: 'Over € 1,000', min: 1000, max: Infinity },
];

function FilterPanel({
  sizes,
  setSizes,
  priceRange,
  setPriceRange,
  onClear,
}: {
  sizes: string[];
  setSizes: (s: string[]) => void;
  priceRange: string;
  setPriceRange: (r: string) => void;
  onClear: () => void;
}): JSX.Element {
  const toggleSize = (size: string) => {
    setSizes(sizes.includes(size) ? sizes.filter((s) => s !== size) : [...sizes, size]);
  };
  const hasFilters = sizes.length > 0 || priceRange !== '';

  return (
    <aside style={{ borderRight: '1px solid var(--border)', minWidth: '200px' }}>
      <div
        className="px-6 py-5 flex items-center justify-between sticky top-[calc(var(--nav-h)+52px)]"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="type-label" style={{ color: 'var(--fg)' }}>Filters</span>
        {hasFilters && (
          <button
            onClick={onClear}
            className="type-label hover:text-[var(--fg)] transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="px-6 py-6 sticky top-[calc(var(--nav-h)+97px)] overflow-y-auto">
        {/* Price */}
        <div className="mb-8">
          <div className="type-label mb-4" style={{ color: 'var(--fg)' }}>Price</div>
          <div className="space-y-2">
            {PRICE_RANGES.map((range) => (
              <label key={range.label} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    border: `1px solid ${priceRange === range.label ? 'var(--fg)' : 'var(--border)'}`,
                    background: priceRange === range.label ? 'var(--fg)' : 'transparent',
                  }}
                >
                  {priceRange === range.label && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <input
                  type="radio"
                  name="priceRange"
                  value={range.label}
                  checked={priceRange === range.label}
                  onChange={() => setPriceRange(priceRange === range.label ? '' : range.label)}
                  className="sr-only"
                />
                <span
                  className="type-label group-hover:text-[var(--fg)] transition-colors"
                  style={{ color: priceRange === range.label ? 'var(--fg)' : 'var(--muted)', letterSpacing: '0.06em' }}
                >
                  {range.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div>
          <div className="type-label mb-4" style={{ color: 'var(--fg)' }}>Size</div>
          <div className="flex flex-wrap gap-2">
            {ALL_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className="type-label px-3 py-2 transition-all duration-150"
                style={{
                  border: `1px solid ${sizes.includes(size) ? 'var(--fg)' : 'var(--border)'}`,
                  background: sizes.includes(size) ? 'var(--fg)' : 'transparent',
                  color: sizes.includes(size) ? 'var(--bg)' : 'var(--muted)',
                  minWidth: '2.5rem',
                }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

const VIEW_SIZES = ['compact', 'comfortable'] as const;
type ViewSize = (typeof VIEW_SIZES)[number];

function CollectionProductCard({ product, compact }: { product: Product; compact: boolean }): JSX.Element {
  const { addItem } = useCart();
  const { toast } = useToast();

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
      quantity: 1,
    });
    toast({ type: 'success', title: 'Added to bag', message: product.name });
  };

  return (
    <a href={`/products/${product.slug}`} className="group block">
      {/* Image */}
      <div
        className="relative overflow-hidden mb-4"
        style={{ aspectRatio: compact ? '1/1' : '3/4' }}
      >
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ background: product.gradient }}
        />

        {/* Grain */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
          }}
        />

        {/* Tag */}
        {product.tag && (
          <div className="absolute top-3 left-3 z-10">
            <span className="type-label px-2 py-1" style={{ background: 'var(--accent)', color: '#fff' }}>
              {product.tag}
            </span>
          </div>
        )}

        {/* Quick Add — appears on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        >
          <button
            className="btn-primary w-full justify-center text-center"
            style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)' }}
            onClick={handleQuickAdd}
          >
            Quick Add
          </button>
        </div>
      </div>

      {/* Text info */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="type-label mb-1" style={{ color: 'var(--muted)' }}>
            {product.category}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? '0.95rem' : '1.1rem',
              fontWeight: 300,
              color: 'var(--fg)',
              lineHeight: 1.2,
            }}
          >
            {product.name}
          </div>
        </div>
        <span className="type-price flex-shrink-0 mt-1" style={{ color: 'var(--fg)' }}>
          {product.priceDisplay}
        </span>
      </div>
    </a>
  );
}

export function CollectionPageClient({
  collection,
  products,
}: {
  collection: { slug: string; label: string; count: number };
  products: Product[];
}): JSX.Element {
  const [sort, setSort] = useState('featured');
  const [viewSize, setViewSize] = useState<ViewSize>('comfortable');
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [filterPrice, setFilterPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (filterSizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.length === 0 || filterSizes.some((s) => p.sizes.includes(s)),
      );
    }
    if (filterPrice) {
      const range = PRICE_RANGES.find((r) => r.label === filterPrice);
      if (range) result = result.filter((p) => p.price >= range.min && p.price < range.max);
    }
    return result;
  }, [products, filterSizes, filterPrice]);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    return 0;
  });

  const gridCols = viewSize === 'compact'
    ? 'grid-cols-2 md:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-3';

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Collection hero banner */}
        <div
          className="relative px-8 md:px-16 py-20 md:py-28 overflow-hidden grain"
          style={{
            background:
              collection.slug === 'womenswear'
                ? 'linear-gradient(145deg, #C4B4A0 0%, #9E8A78 100%)'
                : collection.slug === 'menswear'
                ? 'linear-gradient(145deg, #1C1812 0%, #2E261E 100%)'
                : collection.slug === 'objects'
                ? 'linear-gradient(145deg, #C4BDB4 0%, #A09890 100%)'
                : 'linear-gradient(145deg, #8B5E3C 0%, #4A2D18 100%)',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-8">
            <a href="/" className="type-label hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>Home</a>
            <span className="type-label" style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="type-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Collections</span>
            <span className="type-label" style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
            <span className="type-label" style={{ color: '#fff' }}>{collection.label}</span>
          </div>

          <h1
            className="type-display-xl"
            style={{ color: '#fff', maxWidth: '10ch' }}
          >
            {collection.label}
          </h1>
          <p className="type-label mt-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {products.length} pieces
          </p>

          {/* Decorative element */}
          <div
            className="absolute right-16 top-1/2 -translate-y-1/2 text-right hidden md:block"
            style={{ color: 'rgba(255,255,255,0.08)' }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '8rem',
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              {collection.count}
            </div>
            <div className="type-label" style={{ color: 'rgba(255,255,255,0.15)' }}>
              total objects in collection
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="sticky top-[var(--nav-h)] z-30 px-8 md:px-16 py-4 flex items-center justify-between gap-4"
          style={{
            background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 type-label transition-colors hover:text-[var(--fg)]"
              style={{ color: filtersOpen ? 'var(--fg)' : 'var(--muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="8" y1="12" x2="16" y2="12" />
                <line x1="12" y1="18" x2="12" y2="18" />
              </svg>
              Filters
              {(filterSizes.length > 0 || filterPrice) && (
                <span
                  className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-mono)' }}
                >
                  {filterSizes.length + (filterPrice ? 1 : 0)}
                </span>
              )}
            </button>
            <span className="type-label" style={{ color: 'var(--muted)' }}>
              {sortedProducts.length} result{sortedProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="type-label hidden md:block" style={{ color: 'var(--muted)' }}>Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="type-label py-1 px-2 bg-transparent outline-none cursor-pointer"
                style={{
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.1em',
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* View density toggle */}
            <div className="flex gap-1" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewSize('comfortable')}
                aria-label="Comfortable view"
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{
                  background: viewSize === 'comfortable' ? 'var(--fg)' : 'transparent',
                  color: viewSize === 'comfortable' ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="7" height="7" rx="0.5" />
                  <rect x="9" y="0" width="7" height="7" rx="0.5" />
                  <rect x="0" y="9" width="7" height="7" rx="0.5" />
                  <rect x="9" y="9" width="7" height="7" rx="0.5" />
                </svg>
              </button>
              <button
                onClick={() => setViewSize('compact')}
                aria-label="Compact view"
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{
                  background: viewSize === 'compact' ? 'var(--fg)' : 'transparent',
                  color: viewSize === 'compact' ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="3.5" height="3.5" rx="0.5" />
                  <rect x="4.5" y="0" width="3.5" height="3.5" rx="0.5" />
                  <rect x="9" y="0" width="3.5" height="3.5" rx="0.5" />
                  <rect x="12.5" y="0" width="3.5" height="3.5" rx="0.5" />
                  <rect x="0" y="4.5" width="3.5" height="3.5" rx="0.5" />
                  <rect x="4.5" y="4.5" width="3.5" height="3.5" rx="0.5" />
                  <rect x="9" y="4.5" width="3.5" height="3.5" rx="0.5" />
                  <rect x="12.5" y="4.5" width="3.5" height="3.5" rx="0.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filter + Products layout */}
        <div className="flex">
          {/* Filter sidebar — slides open */}
          <div
            style={{
              width: filtersOpen ? '240px' : '0',
              overflow: 'hidden',
              transition: 'width 0.35s cubic-bezier(0.16,1,0.3,1)',
              flexShrink: 0,
            }}
          >
            <FilterPanel
              sizes={filterSizes}
              setSizes={setFilterSizes}
              priceRange={filterPrice}
              setPriceRange={setFilterPrice}
              onClear={() => { setFilterSizes([]); setFilterPrice(''); }}
            />
          </div>

          {/* Products */}
          <div className="flex-1 min-w-0 px-8 md:px-12 py-12">
            {sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                  }}
                >
                  No pieces found
                </p>
                <button
                  className="btn-ghost"
                  onClick={() => { setFilterSizes([]); setFilterPrice(''); }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className={`grid ${gridCols} gap-6 md:gap-8`}>
                {sortedProducts.map((product) => (
                  <CollectionProductCard
                    key={product.id}
                    product={product}
                    compact={viewSize === 'compact'}
                  />
                ))}
              </div>
            )}

            {/* Load more stub */}
            {sortedProducts.length > 0 && collection.count > sortedProducts.length && (
              <div className="flex justify-center mt-16">
                <button className="btn-ghost px-16">
                  Load more ({collection.count - sortedProducts.length} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
