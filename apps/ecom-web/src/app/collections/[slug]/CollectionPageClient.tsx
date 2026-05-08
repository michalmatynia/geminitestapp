'use client';

import { useState, useMemo, useCallback, useRef, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductImage } from '@/components/ProductImage';
import type { Product } from '@/data/products';
import type { ProductsCollectionContent, ProductsContent } from '@/data/productsContent';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { pieceCountWord, productCountWord, resultCountWord, formatPrice, type EcomLocale } from '@/lib/locales';

const LOAD_MORE_SIZE = 24;

function FilterPanel({
  sizes,
  setSizes,
  priceRange,
  setPriceRange,
  onClear,
  content,
}: {
  sizes: string[];
  setSizes: (s: string[]) => void;
  priceRange: string;
  setPriceRange: (r: string) => void;
  onClear: () => void;
  content: ProductsCollectionContent;
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
        <span className="type-label" style={{ color: 'var(--fg)' }}>{content.filtersLabel}</span>
        {hasFilters && (
          <button
            onClick={onClear}
            className="type-label hover:text-[var(--fg)] transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            {content.clearAllLabel}
          </button>
        )}
      </div>

      <div className="px-6 py-6 sticky top-[calc(var(--nav-h)+97px)] overflow-y-auto">
        {/* Price */}
        <div className="mb-8">
          <div className="type-label mb-4" style={{ color: 'var(--fg)' }}>{content.priceLabel}</div>
          <div className="space-y-2">
            {content.priceRanges.map((range) => (
              <label key={range.label} className="flex items-center gap-3 cursor-pointer group">
                <div
                  className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    border: `1px solid ${priceRange === range.label ? 'var(--accent)' : 'var(--border)'}`,
                    background: priceRange === range.label ? 'rgba(var(--accent-rgb),0.2)' : 'transparent',
                  }}
                >
                  {priceRange === range.label && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
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
                  style={{ color: priceRange === range.label ? 'var(--accent)' : 'var(--muted)', letterSpacing: '0.06em' }}
                >
                  {range.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Sizes */}
        <div>
          <div className="type-label mb-4" style={{ color: 'var(--fg)' }}>{content.sizeLabel}</div>
          <div className="flex flex-wrap gap-2">
            {content.sizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className="type-label px-3 py-2 transition-all duration-150"
                style={{
                  border: `1px solid ${sizes.includes(size) ? 'var(--accent)' : 'var(--border)'}`,
                  background: sizes.includes(size) ? 'rgba(var(--accent-rgb),0.15)' : 'transparent',
                  color: sizes.includes(size) ? 'var(--accent)' : 'var(--muted)',
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

function CollectionProductCard({
  product,
  compact,
  content,
  locale,
  priority = false,
}: {
  product: Product;
  compact: boolean;
  content: ProductsCollectionContent;
  locale: EcomLocale;
  priority?: boolean;
}): JSX.Element {
  const { addItem } = useCart();
  const { toast } = useToast();
  const localizedHref = useLocalizedHref();

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
    toast({ type: 'success', title: content.addedToastTitle, message: product.shortName ?? product.name });
  };

  return (
    <a href={localizedHref(`/products/${product.slug}`)} className="group block">
      {/* Image */}
      <div
        className="relative overflow-hidden mb-3"
        style={{ aspectRatio: compact ? '1/1' : '3/4' }}
      >
        <ProductImage
          imageUrl={product.imageUrl}
          gradient={product.gradient}
          alt={product.shortName ?? product.name}
          className="absolute inset-0"
          sizes="(max-width: 768px) 50vw, 33vw"
          fit="contain"
          position="center"
          priority={priority}
        />

        {/* Grain */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
            backgroundSize: '150px',
          }}
        />

        {/* Tag */}
        {product.tag && (
          <div className="absolute top-3 left-3 z-10">
            <span
              className="type-label px-2 py-1 inline-block"
              style={{
                background: 'rgba(var(--accent-rgb),0.1)',
                color: 'var(--accent)',
                border: '1px solid rgba(var(--accent-rgb),0.35)',
              }}
            >
              {product.tag}
            </span>
          </div>
        )}

        {/* Hover overlay — darkens image so button is readable */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
        />

        {/* Quick Add — sits inside the image, slides up from bottom */}
        <div
          className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100"
        >
          <button
            className="btn-primary w-full justify-center text-center"
            style={{ background: 'rgba(var(--accent-rgb),0.18)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),0.5)', backdropFilter: 'blur(6px)' }}
            onClick={handleQuickAdd}
          >
            {content.quickAddLabel}
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
              fontSize: compact ? '0.9rem' : '1rem',
              fontWeight: 600,
              color: 'var(--fg)',
              lineHeight: 1.3,
            }}
          >
            {product.shortName ?? product.name}
          </div>
        </div>
        <span className="type-price flex-shrink-0 mt-1" style={{ color: 'var(--soft-gold)', textShadow: '0 0 8px rgba(var(--gold-rgb),0.3)' }}>
          {formatPrice(product.price, locale)}
        </span>
      </div>
    </a>
  );
}

export function CollectionPageClient({
  collection,
  products: initialProducts,
  total,
  source = 'static',
  content,
}: {
  collection: { slug: string; label: string; count: number };
  products: Product[];
  total?: number;
  source?: 'mentios' | 'static';
  content: ProductsContent;
}): JSX.Element {
  const collectionContent = content.collection;
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const [sort, setSort] = useState('featured');
  const [viewSize, setViewSize] = useState<ViewSize>('comfortable');
  const [filterSizes, setFilterSizes] = useState<string[]>([]);
  const [filterPrice, setFilterPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // All products accumulated across load-more fetches
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [loadedCount, setLoadedCount] = useState(initialProducts.length);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const displayTotal = total ?? collection.count;
  const canLoadMore = source === 'mentios' && loadedCount < displayTotal;

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const collectionParam = collection.slug !== 'all'
        ? `&collection=${encodeURIComponent(collection.slug)}`
        : '';
      const url = `/api/products?skip=${loadedCount}&limit=${LOAD_MORE_SIZE}&locale=${locale}${collectionParam}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as { products: Product[] };
      const newProducts = data.products ?? [];
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newProducts.filter((p) => !existingIds.has(p.id))];
      });
      setLoadedCount((prev) => prev + newProducts.length);
    } catch {
      // silently keep current list
    } finally {
      setIsLoadingMore(false);
    }
  }, [collection.slug, isLoadingMore, loadedCount, locale]);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];
    if (filterSizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.length === 0 || filterSizes.some((s) => p.sizes.includes(s)),
      );
    }
    if (filterPrice) {
      const range = collectionContent.priceRanges.find((r) => r.label === filterPrice);
      if (range) result = result.filter((p) => p.price >= range.min && (range.max == null || p.price < range.max));
    }
    return result;
  }, [allProducts, filterSizes, filterPrice, collectionContent.priceRanges]);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
    return 0;
  });
  const collectionCountWord = source === 'mentios'
    ? productCountWord(displayTotal, locale, collectionContent.productsCountLabel, collectionContent.productsCountLabel)
    : pieceCountWord(displayTotal, locale, collectionContent.piecesCountLabel, collectionContent.piecesCountLabel);
  const resultWord = resultCountWord(sortedProducts.length, locale, collectionContent.resultSingular, collectionContent.resultPlural);

  const gridCols = viewSize === 'compact'
    ? 'grid-cols-2 md:grid-cols-4'
    : 'grid-cols-1 md:grid-cols-3';

  const mainRef = useRef<HTMLElement>(null);
  const heroBannerRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const heroDecorRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    /* Entrance: content slides up */
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.coll-breadcrumb', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 0.1);
    tl.fromTo('.coll-h1', { opacity: 0, yPercent: 80 }, { opacity: 1, yPercent: 0, duration: 1.1 }, 0.25);
    tl.fromTo('.coll-count', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7 }, 0.5);
    tl.fromTo('.coll-decor', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 1.0 }, 0.3);

    /* Scroll parallax on the hero banner */
    ScrollTrigger.create({
      trigger: heroBannerRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
      onUpdate: (self) => {
        const p = self.progress;
        /* Background layer moves up slower */
        gsap.set(heroBannerRef.current, { backgroundPositionY: `${p * 40}%` });
        /* Text content drifts up */
        gsap.set(heroContentRef.current, { y: p * 80 });
        /* Decorative number drifts opposite (down) */
        gsap.set(heroDecorRef.current, { y: -(p * 50) });
      },
    });

    /* Product cards stagger in */
    ScrollTrigger.batch('.coll-product-card', {
      start: 'top 92%',
      onEnter: (batch) => {
        gsap.fromTo(batch,
          { opacity: 0, y: 50, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'expo.out', stagger: 0.07 });
      },
    });
  }, { scope: mainRef, dependencies: [] });

  return (
    <>
      <SiteNav />
      <main ref={mainRef} style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Collection hero banner */}
        <div
          ref={heroBannerRef}
          className="relative px-8 md:px-16 py-20 md:py-28 overflow-hidden grain"
          style={{
            background:
              collection.slug === 'womenswear'
                ? 'linear-gradient(145deg, #21141D 0%, #2e0a28 50%, #3d0a40 100%)'
                : collection.slug === 'menswear'
                ? 'linear-gradient(145deg, #0a1500 0%, #142200 50%, #1e3300 100%)'
                : collection.slug === 'objects'
                ? 'linear-gradient(145deg, #0B0D21 0%, #1a1040 50%, #21141D 100%)'
                : collection.slug === 'all'
                ? 'linear-gradient(145deg, #01000D 0%, #0B0D21 100%)'
                : 'linear-gradient(145deg, #0f0520 0%, #1a0a35 50%, #28105a 100%)',
          }}
        >
          <div ref={heroContentRef} className="will-change-transform">
            {/* Breadcrumb */}
            <div className="coll-breadcrumb flex items-center gap-2 mb-8" style={{ opacity: 0 }}>
              <a href={localizedHref('/')} className="type-label hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.5)' }}>{collectionContent.homeBreadcrumbLabel}</a>
              <span className="type-label" style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span className="type-label" style={{ color: 'rgba(255,255,255,0.8)' }}>{collectionContent.collectionsBreadcrumbLabel}</span>
              <span className="type-label" style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
              <span className="type-label" style={{ color: '#fff' }}>{collection.label}</span>
            </div>

            <div className="overflow-hidden">
              <h1 className="coll-h1 type-display-xl" style={{ color: '#fff', maxWidth: '10ch', opacity: 0 }}>
                {collection.label}
              </h1>
            </div>
            <p className="coll-count type-label mt-4" style={{ color: 'rgba(255,255,255,0.5)', opacity: 0 }}>
              {displayTotal} {collectionCountWord}
            </p>
          </div>

          {/* Decorative count — parallaxes opposite direction */}
          <div
            ref={heroDecorRef}
            className="coll-decor absolute right-16 top-1/2 -translate-y-1/2 text-right hidden md:block will-change-transform"
            style={{ color: 'rgba(255,255,255,0.08)', opacity: 0 }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '8rem',
                fontWeight: 300,
                lineHeight: 1,
              }}
            >
              {displayTotal}
            </div>
            <div className="type-label" style={{ color: 'rgba(255,255,255,0.15)' }}>
              {collectionContent.totalInCollectionLabel}
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
              {collectionContent.filtersLabel}
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
              {sortedProducts.length}
              {allProducts.length < displayTotal ? ` ${collectionContent.ofLabel} ${displayTotal}` : ''} {resultWord}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort */}
            <div className="flex items-center gap-2">
              <span className="type-label hidden md:block" style={{ color: 'var(--muted)' }}>{collectionContent.sortLabel}</span>
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
                  background: 'var(--card-bg)',
                }}
              >
                {collectionContent.sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* View density toggle */}
            <div className="flex gap-1" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewSize('comfortable')}
                aria-label={collectionContent.comfortableViewAriaLabel}
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{
                  background: viewSize === 'comfortable' ? 'rgba(var(--accent-rgb),0.15)' : 'transparent',
                  color: viewSize === 'comfortable' ? 'var(--accent)' : 'var(--muted-teal)',
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
                aria-label={collectionContent.compactViewAriaLabel}
                className="w-8 h-8 flex items-center justify-center transition-colors"
                style={{
                  background: viewSize === 'compact' ? 'rgba(var(--accent-rgb),0.15)' : 'transparent',
                  color: viewSize === 'compact' ? 'var(--accent)' : 'var(--muted-teal)',
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
              content={collectionContent}
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
                    fontWeight: 600,
                    color: 'var(--muted)',
                  }}
                >
                  {collectionContent.noResultsTitle}
                </p>
                <button
                  className="btn-ghost"
                  onClick={() => { setFilterSizes([]); setFilterPrice(''); }}
                >
                  {collectionContent.clearFiltersLabel}
                </button>
              </div>
            ) : (
              <div className={`grid ${gridCols} gap-6 md:gap-8`}>
                {sortedProducts.map((product, index) => (
                  <div key={product.id} className="coll-product-card" style={{ opacity: 0 }}>
                    <CollectionProductCard
                      product={product}
                      compact={viewSize === 'compact'}
                      content={collectionContent}
                      locale={locale}
                      priority={index < 4}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Load more */}
            {canLoadMore && (
              <div className="flex flex-col items-center mt-16 gap-3">
                <button
                  className="btn-ghost px-16 flex items-center gap-3"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  style={{ opacity: isLoadingMore ? 0.6 : 1 }}
                >
                  {isLoadingMore ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 0.9s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      {collectionContent.loadingLabel}
                    </>
                  ) : (
                    `${collectionContent.loadMorePrefix} (${displayTotal - loadedCount} ${collectionContent.remainingLabel})`
                  )}
                </button>
                <p className="type-label" style={{ color: 'var(--muted)' }}>
                  {collectionContent.showingLabel} {allProducts.length} {collectionContent.ofLabel} {displayTotal}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
