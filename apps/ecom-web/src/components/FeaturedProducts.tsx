/* eslint-disable @typescript-eslint/strict-boolean-expressions,complexity,max-lines-per-function */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { FeaturedProductCard } from '@/components/FeaturedProductCard';
import { HOME_CONTENT_DEFAULTS, type HomeFeaturedContent } from '@/data/homeContent';
import {
  getHomeFeaturedFilterConfigs,
  type CatalogCategoryOption,
  type HomeFeaturedFilterConfig,
} from '@/lib/homeFeaturedFilters';
import { gsap, useGSAP } from '@/lib/gsap';

const FEATURED_FILTER_LIMIT = 24;

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

export function FeaturedProducts({
  products: dbProducts,
  content = HOME_CONTENT_DEFAULTS.featured,
  catalogCategories = [],
}: {
  products?: Product[] | null;
  content?: HomeFeaturedContent;
  catalogCategories?: CatalogCategoryOption[];
}): JSX.Element {
  const featured = useMemo(
    () => (dbProducts && dbProducts.length > 0 ? dbProducts : STATIC_FEATURED),
    [dbProducts],
  );
  const isLive = dbProducts && dbProducts.length > 0;
  const localizedHref = useLocalizedHref();
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const filterFetchSeqRef = useRef(0);
  const [activeFilter, setActiveFilter] = useState(content.filters[0] ?? 'All');
  const [visibleProducts, setVisibleProducts] = useState<Product[]>(featured);
  const [isFiltering, setIsFiltering] = useState(false);

  const filterConfigs = useMemo(
    () => getHomeFeaturedFilterConfigs(content.filters, catalogCategories),
    [catalogCategories, content.filters],
  );

  const activeFilterConfig = filterConfigs.find((filter) => filter.label === activeFilter) ?? {
    categories: [],
    href: content.ctaHref,
    key: 'all' as const,
    label: content.filters[0] ?? 'All',
  };

  useEffect(() => {
    setActiveFilter(content.filters[0] ?? 'All');
    setVisibleProducts(featured);
  }, [content.filters, featured]);

  const handleFilterClick = useCallback(async (filter: HomeFeaturedFilterConfig) => {
    setActiveFilter(filter.label);

    if (filter.key === null || filter.key === 'all' || filter.categories.length === 0) {
      filterFetchSeqRef.current += 1;
      setVisibleProducts(featured);
      setIsFiltering(false);
      return;
    }

    if (!isLive) {
      const selected = new Set(filter.categories);
      setVisibleProducts(featured.filter((product) => selected.has(product.category)));
      return;
    }

    setIsFiltering(true);
    const seq = ++filterFetchSeqRef.current;

    try {
      const params = new URLSearchParams({
        categories: filter.categories.join(','),
        limit: String(FEATURED_FILTER_LIMIT),
        locale,
      });
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('Failed to fetch filtered products');
      const data = (await res.json()) as { products?: Product[] };
      if (seq !== filterFetchSeqRef.current) return;
      setVisibleProducts(data.products ?? []);
    } catch {
      if (seq === filterFetchSeqRef.current) {
        const selected = new Set(filter.categories);
        setVisibleProducts(featured.filter((product) => selected.has(product.category)));
      }
    } finally {
      if (seq === filterFetchSeqRef.current) setIsFiltering(false);
    }
  }, [featured, isLive, locale]);

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
    <section id='new-drops' ref={sectionRef} className='relative isolate scroll-mt-28 px-6 md:px-10 pb-16 md:pb-20 max-w-screen-2xl mx-auto'>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 bottom-0 z-20 h-56 bg-gradient-to-t from-black/70 via-black/25 to-transparent'
      />

      {/* Section header */}
      <div className='feat-header relative z-10 flex items-end justify-between mb-12'>
        <div>
          <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>
            {isLive ? content.liveEyebrow : content.fallbackEyebrow}
          </div>
          <h2 className='type-display-lg' style={{ color: 'var(--fg)' }}>
            {content.title}
          </h2>
        </div>
        <div className='hidden md:flex items-center gap-3'>
          {filterConfigs.map((filter) => {
            const isActive = filter.label === activeFilter;
            return (
              <button
                key={filter.label}
                className='type-label px-4 py-2 transition-all duration-200'
                type='button'
                aria-pressed={isActive}
                disabled={isFiltering && isActive}
                onClick={() => {
                  handleFilterClick(filter).catch(() => undefined);
                }}
                style={{
                  background: isActive ? 'rgba(var(--accent-rgb),0.12)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--muted-teal)',
                  border: `1px solid ${isActive ? 'rgba(var(--accent-rgb),0.4)' : 'rgba(var(--accent-rgb),0.1)'}`,
                  boxShadow: isActive ? '0 0 8px rgba(var(--accent-rgb),0.12)' : 'none',
                  cursor: isFiltering && isActive ? 'wait' : 'pointer',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className='feat-grid relative z-10 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4'>
        {visibleProducts.map((product, index) => (
          <div key={product.id} className='feat-card'>
            <FeaturedProductCard product={product} quickAddLabel={content.quickAddLabel} priority={index < 8} />
          </div>
        ))}
      </div>

      {/* View all CTA */}
      <div className='feat-cta relative z-30 flex justify-center mt-10'>
        <a href={localizedHref(activeFilterConfig.href)} className='btn-primary px-16'>
          {isLive ? content.ctaLiveLabel : content.ctaFallbackLabel}
          <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
            <path d='M5 12h14M12 5l7 7-7 7' />
          </svg>
        </a>
      </div>
    </section>
  );
}
