/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-floating-promises, @typescript-eslint/no-shadow, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions, complexity, max-lines, max-lines-per-function, no-nested-ternary */
'use client';

import { useState, useMemo, useCallback, useRef, useEffect, type JSX } from 'react';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductImage } from '@/components/ProductImage';
import type { Product } from '@/data/products';
import type { ProductsContent } from '@/data/productsContent';
import { formatPrice, type EcomLocale } from '@/lib/locales';
import { getCategorySelectorTitle, type ProductCategoryDisplayOption } from '@/lib/productFilterLabels';
import { productMatchesThemes } from '@/lib/productThemes';
import { productMatchesMaterials } from '@/lib/productMaterial';
import { productMatchesSizes } from '@/lib/productSizeInfo';
import { productMatchesLores } from '@/lib/productLore';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';

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

const LOAD_MORE_SIZE = 24;
const PRICE_SLIDER_MIN = 0;
const PRICE_SLIDER_MAX = 5000;
const PRICE_SLIDER_STEP = 10;

function PriceRangeSlider({
  valueMin,
  valueMax,
  absMax,
  onDrag,
  onCommit,
  formatValue,
}: {
  valueMin: number;
  valueMax: number;
  absMax: number;
  onDrag: (min: number, max: number) => void;
  onCommit: () => void;
  formatValue: (v: number) => string;
}): JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null);
  // Stable refs so pointer handlers never go stale without recreating
  const valueMinRef = useRef(valueMin);
  const valueMaxRef = useRef(valueMax);
  const onDragRef = useRef(onDrag);
  const onCommitRef = useRef(onCommit);
  valueMinRef.current = valueMin;
  valueMaxRef.current = valueMax;
  onDragRef.current = onDrag;
  onCommitRef.current = onCommit;

  const pct = (v: number) => ((v - PRICE_SLIDER_MIN) / (absMax - PRICE_SLIDER_MIN)) * 100;

  const valueFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return PRICE_SLIDER_MIN;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = PRICE_SLIDER_MIN + ratio * (absMax - PRICE_SLIDER_MIN);
    return Math.round(raw / PRICE_SLIDER_STEP) * PRICE_SLIDER_STEP;
  }, [absMax]);

  const makeHandleProps = useCallback((which: 'min' | 'max') => ({
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      if (!(e.currentTarget as HTMLDivElement).hasPointerCapture(e.pointerId)) return;
      const v = valueFromClientX(e.clientX);
      if (which === 'min') {
        onDragRef.current(Math.min(v, valueMaxRef.current - PRICE_SLIDER_STEP), valueMaxRef.current);
      } else {
        onDragRef.current(valueMinRef.current, Math.max(v, valueMinRef.current + PRICE_SLIDER_STEP));
      }
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      onCommitRef.current();
    },
  }), [valueFromClientX]);

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: 'var(--card-bg)',
    border: '1.5px solid var(--accent)',
    cursor: 'grab',
    touchAction: 'none',
    zIndex: 1,
  };

  return (
    <div>
      {/* Price labels */}
      <div className='flex justify-between mb-3'>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>
          {formatValue(valueMin)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent)' }}>
          {formatValue(valueMax)}
        </span>
      </div>

      {/* Slider track — receives move/up when no handle is captured yet */}
      <div
        ref={trackRef}
        className='relative'
        style={{ height: '20px', touchAction: 'none', userSelect: 'none' }}
      >
        {/* Background track */}
        <div
          className='absolute top-1/2 w-full'
          style={{ height: '1px', background: 'var(--border)', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        {/* Active fill */}
        <div
          className='absolute top-1/2'
          style={{
            height: '1px',
            background: 'var(--accent)',
            left: `${pct(valueMin)}%`,
            right: `${100 - pct(valueMax)}%`,
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        {/* Min handle */}
        <div style={{ ...handleStyle, left: `${pct(valueMin)}%` }} {...makeHandleProps('min')} />
        {/* Max handle */}
        <div style={{ ...handleStyle, left: `${pct(valueMax)}%` }} {...makeHandleProps('max')} />
      </div>
    </div>
  );
}

function CatalogSkeleton({ count = 10 }: { count?: number }): JSX.Element {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9'>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div
            className='w-full mb-2 animate-pulse'
            style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)' }}
          />
          <div className='animate-pulse mb-1.5' style={{ height: '0.55rem', width: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div className='animate-pulse mb-1' style={{ height: '0.7rem', width: '80%', background: 'rgba(255,255,255,0.06)' }} />
          <div className='animate-pulse' style={{ height: '0.55rem', width: '30%', background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ))}
    </div>
  );
}

// Matches the "You may also like" related-products card in ProductDetailClient,
// scaled down (smaller fonts, 1:1 aspect) so more pieces fit per row.
function CatalogCard({
  product,
  locale,
  addToBagLabel,
  priority = false,
}: {
  product: Product;
  locale: EcomLocale;
  addToBagLabel: string;
  priority?: boolean;
}): JSX.Element {
  const localizedHref = useLocalizedHref();
  const { addItem, openCart } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggle, getCount, requestCount } = useWishlist();

  const wishlisted = isWishlisted(product.id);
  const count = getCount(product.id);

  useEffect(() => { requestCount(product.id); }, [product.id, requestCount]);

  const handleAddToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      currencyCode: product.currencyCode,
      size: '',
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    openCart();
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
    <a href={localizedHref(`/products/${product.slug}`)} className='group block'>
      {/* Image with slide-up "Add to basket" panel on hover */}
      <div className='relative w-full overflow-hidden mb-2' style={{ aspectRatio: '1/1' }}>
        <ProductImage
          imageUrl={product.imageUrl}
          gradient={product.gradient}
          alt={product.shortName ?? product.name}
          className='absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]'
          sizes='(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw'
          fit='cover'
          position='center'
          priority={priority}
        />
        {/* Wishlist star — only for logged-in users */}
        {user && (
          <button
            onClick={handleToggleWishlist}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className='absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100'
            style={{
              background: 'rgba(4,3,20,0.65)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: wishlisted ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
            }}
          >
            <StarIcon filled={wishlisted} size={11} />
          </button>
        )}
        {/* Hover panel — slides up from bottom of image */}
        <div
          className='absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out'
          style={{ background: 'rgba(4,3,20,0.82)', backdropFilter: 'blur(6px)' }}
        >
          <button
            onClick={handleAddToBasket}
            className='w-full py-3 transition-colors hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.1)]'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fff',
            }}
          >
            {addToBagLabel}
          </button>
        </div>
      </div>

      {/* Tag badge (status) below image */}
      {product.tag && (
        <div className='mb-1.5'>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.52rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              border: '1px solid rgba(var(--accent-rgb),0.35)',
              padding: '0.15rem 0.45rem',
            }}
          >
            {product.tag}
          </span>
        </div>
      )}

      {/* Category */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: '0.2rem',
        }}
      >
        {product.category}
      </div>

      {/* Lore badge under category */}
      {product.lore && (
        <div style={{ marginBottom: '0.25rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.52rem',
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
          fontSize: '0.82rem',
          fontWeight: 300,
          color: 'var(--fg)',
          lineHeight: 1.3,
          marginBottom: '0.25rem',
        }}
      >
        {product.shortName ?? product.name}
      </div>
      <div className='flex items-center gap-1.5'>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>
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
    </a>
  );
}

function FilterSection({
  title,
  children,
  searchPlaceholder = 'Filter…',
}: {
  title: string;
  children: React.ReactNode | ((query: string) => React.ReactNode);
  searchPlaceholder?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleToggle = () => {
    setOpen((v) => {
      if (v) setQuery('');
      return !v;
    });
  };

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={handleToggle}
        className='flex items-center justify-between w-full py-3 transition-colors hover:text-[var(--fg)]'
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <span>{title}</span>
        <svg
          width='10'
          height='10'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points='6 9 12 15 18 9' />
        </svg>
      </button>
      {open && (
        <div className='pb-4'>
          {typeof children === 'function' && (
            <div className='relative mb-2.5'>
              <input
                type='text'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className='w-full bg-transparent pb-1 pr-5 outline-none border-b border-[var(--border)] focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]'
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.05em',
                  color: 'var(--fg)',
                }}
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className='absolute right-0 top-0 leading-none transition-opacity hover:opacity-70'
                  style={{ color: 'var(--muted)', fontSize: '0.65rem' }}
                >
                  ✕
                </button>
              ) : (
                <svg
                  className='absolute right-0 top-0.5 pointer-events-none'
                  width='9'
                  height='9'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  style={{ color: 'var(--muted)' }}
                >
                  <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                </svg>
              )}
            </div>
          )}
          {typeof children === 'function' ? children(query) : children}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className='flex items-center gap-1.5 w-full text-left transition-colors hover:text-[var(--fg)]'
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
        letterSpacing: '0.06em',
        color: active ? 'var(--accent)' : 'var(--muted)',
        padding: '0.15rem 0',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '0.5rem',
          height: '1px',
          background: active ? 'var(--accent)' : 'transparent',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
      />
      {children}
    </button>
  );
}

function SidebarFilters({
  selectedTypes,
  setSelectedType,
  availableTypes,
  selectedParentCategories,
  setSelectedParentCategory,
  availableParentCategories,
  sliderMin,
  sliderMax,
  sliderAbsMax,
  onPriceDrag,
  onPriceCommit,
  selectedMaterials,
  setSelectedMaterial,
  availableMaterials,
  selectedSizes,
  setSelectedSize,
  availableSizes,
  selectedLores,
  setSelectedLore,
  availableLores,
  newOnly,
  onNewOnly,
  hasFilters,
  onClear,
  onClose,
  totalCount,
  content,
}: {
  selectedTypes: string[];
  setSelectedType: (v: string) => void;
  availableTypes: string[];
  selectedParentCategories: string[];
  setSelectedParentCategory: (v: string) => void;
  availableParentCategories: string[];
  sliderMin: number;
  sliderMax: number;
  sliderAbsMax: number;
  onPriceDrag: (min: number, max: number) => void;
  onPriceCommit: () => void;
  selectedMaterials: string[];
  setSelectedMaterial: (v: string) => void;
  availableMaterials: string[];
  selectedSizes: string[];
  setSelectedSize: (v: string) => void;
  availableSizes: string[];
  selectedLores: string[];
  setSelectedLore: (v: string) => void;
  availableLores: string[];
  newOnly: boolean;
  onNewOnly: (v: boolean) => void;
  hasFilters: boolean;
  onClear: () => void;
  onClose?: () => void;
  totalCount: number;
  content: ProductsContent;
}): JSX.Element {
  const col = content.collection;
  const locale = useLocale();

  const wrap = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); onClose?.(); };
  const fmtPrice = (v: number) => formatPrice(v, locale);

  return (
    <div className='px-5 py-5'>
      <div className='flex items-center justify-between mb-4'>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--fg)',
          }}
        >
          {col.filtersLabel}
        </span>
        {hasFilters && (
          <button
            onClick={() => { onClear(); onClose?.(); }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.08em',
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {col.clearAllLabel}
          </button>
        )}
      </div>

      {/* New arrivals toggle — a simple filter, not collapsible */}
      <div className='py-3' style={{ borderBottom: '1px solid var(--border)' }}>
        <FilterButton active={newOnly} onClick={() => { onNewOnly(!newOnly); onClose?.(); }}>
          {col.newArrivalsLabel}
        </FilterButton>
      </div>

      <FilterSection title={col.priceLabel}>
        {() => (
          <PriceRangeSlider
            valueMin={sliderMin}
            valueMax={sliderMax}
            absMax={sliderAbsMax}
            onDrag={onPriceDrag}
            onCommit={onPriceCommit}
            formatValue={fmtPrice}
          />
        )}
      </FilterSection>

      {availableTypes.length > 0 && (
        <FilterSection title={col.universeLabel}>
          {(query) => {
            const q = query.toLowerCase();
            const filtered = q ? availableTypes.filter((t) => t.toLowerCase().includes(q)) : availableTypes;
            return (
              <div className='space-y-0.5'>
                {filtered.map((theme) => (
                  <FilterButton
                    key={theme}
                    active={selectedTypes.includes(theme)}
                    onClick={() => { setSelectedType(theme); onClose?.(); }}
                  >
                    <span className='flex-1 min-w-0 truncate'>{theme}</span>
                  </FilterButton>
                ))}
              </div>
            );
          }}
        </FilterSection>
      )}

      {availableParentCategories.length > 0 && (
        <FilterSection title={col.typeLabel}>
          {(query) => {
            const q = query.toLowerCase();
            const filtered = q ? availableParentCategories.filter((p) => p.toLowerCase().includes(q)) : availableParentCategories;
            return (
              <div className='space-y-0.5'>
                {filtered.map((productType) => (
                  <FilterButton
                    key={productType}
                    active={selectedParentCategories.includes(productType)}
                    onClick={() => { setSelectedParentCategory(productType); onClose?.(); }}
                  >
                    <span className='flex-1 min-w-0 truncate'>{productType}</span>
                  </FilterButton>
                ))}
              </div>
            );
          }}
        </FilterSection>
      )}

      {availableMaterials.length > 0 && (
        <FilterSection title={col.materialLabel}>
          {(query) => {
            const q = query.toLowerCase();
            const filtered = q ? availableMaterials.filter((m) => m.toLowerCase().includes(q)) : availableMaterials;
            return (
              <div className='space-y-0.5'>
                {filtered.map((material) => (
                  <FilterButton
                    key={material}
                    active={selectedMaterials.includes(material)}
                    onClick={() => { setSelectedMaterial(material); onClose?.(); }}
                  >
                    {material}
                  </FilterButton>
                ))}
              </div>
            );
          }}
        </FilterSection>
      )}

      {availableSizes.length > 0 && (
        <FilterSection title={col.sizeLabel}>
          {(query) => {
            const q = query.toLowerCase();
            const filtered = q ? availableSizes.filter((s) => s.toLowerCase().includes(q)) : availableSizes;
            return (
              <div className='space-y-0.5'>
                {filtered.map((size) => (
                  <FilterButton
                    key={size}
                    active={selectedSizes.includes(size)}
                    onClick={() => { setSelectedSize(size); onClose?.(); }}
                  >
                    {size}
                  </FilterButton>
                ))}
              </div>
            );
          }}
        </FilterSection>
      )}

      {availableLores.length > 0 && (
        <FilterSection title={col.loreLabel}>
          {(query) => {
            const q = query.toLowerCase();
            const filtered = q ? availableLores.filter((l) => l.toLowerCase().includes(q)) : availableLores;
            return (
              <div className='space-y-0.5'>
                {filtered.map((lore) => (
                  <FilterButton
                    key={lore}
                    active={selectedLores.includes(lore)}
                    onClick={() => { setSelectedLore(lore); onClose?.(); }}
                  >
                    {lore}
                  </FilterButton>
                ))}
              </div>
            );
          }}
        </FilterSection>
      )}
    </div>
  );
}

type FilterState = {
  category: string;
  categories: string[]; // resolved leaf category names forwarded to the API
  types: string[];      // user-selected themes (e.g. "Anime") — all-but-last-word of leaf name
  parentCats: string[]; // user-selected product types (e.g. "Breloki") — last word of leaf name
  themes: string[];
  materials: string[];
  sizes: string[];
  lores: string[];
  sort: string;
  priceMin: number | undefined;
  priceMax: number | undefined;
  search: string;
  newOnly: boolean;
};

// Extract product type from leaf category name: last word, locale-aware.
// "Anime Breloki" → "Breloki" ; "Anime Keychains" → "Keychains"
function extractLeafProductType(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? '';
}


function resolveLeafCategories(
  types: string[],      // canonical English theme names (e.g. "Anime", "Gaming")
  parentCats: string[], // product types from last word of leaf name (e.g. "Breloki", "Keychains")
  allCats: Array<{ name: string; parentName?: string | null; parentNameEn?: string | null }>,
): string[] {
  if (types.length === 0 && parentCats.length === 0) return [];
  const themeSet = new Set(types.map((t) => t.toLowerCase()));
  const typeSet = new Set(parentCats.map((t) => t.toLowerCase()));
  return allCats
    .filter((cat) => {
      const leafType = extractLeafProductType(cat.name).toLowerCase();
      const parentName = (cat.parentNameEn ?? cat.parentName ?? '').toLowerCase();
      const typeOk = typeSet.size === 0 || typeSet.has(leafType);
      const themeOk = themeSet.size === 0 || (parentName.length > 0 && themeSet.has(parentName));
      return typeOk && themeOk;
    })
    .map((cat) => cat.name);
}

function uniqueFilterValues(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function parseFilterList(value: string | null): string[] {
  if (!value) return [];
  return uniqueFilterValues(value.split(','));
}

export function CatalogPageClient({
  products: initialProducts,
  total,
  source = 'static',
  content,
  categories,
  initialFilters,
  availableMaterials = [],
  availableSizes = [],
  availableLores = [],
  sliderMaxPrice = PRICE_SLIDER_MAX,
}: {
  products: Product[];
  total: number;
  source?: 'mentios' | 'static';
  content: ProductsContent;
  categories: Array<{ id: string; name: string; count: number } & ProductCategoryDisplayOption>;
  initialFilters?: FilterState;
  availableMaterials?: string[];
  availableSizes?: string[];
  availableLores?: string[];
  sliderMaxPrice?: number;
}): JSX.Element {
  const col = content.collection;
  const locale = useLocale();
  const localizedHref = useLocalizedHref();

  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [loadedCount, setLoadedCount] = useState(initialProducts.length);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState(initialFilters?.sort ?? 'featured');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialFilters?.types ?? []);
  const [selectedParentCategories, setSelectedParentCategories] = useState<string[]>(initialFilters?.parentCats ?? []);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(initialFilters?.themes ?? []);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>(initialFilters?.materials ?? []);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialFilters?.sizes ?? []);
  const [selectedLores, setSelectedLores] = useState<string[]>(initialFilters?.lores ?? []);
  const [sliderMin, setSliderMin] = useState(initialFilters?.priceMin ?? PRICE_SLIDER_MIN);
  const [sliderMax, setSliderMax] = useState(initialFilters?.priceMax ?? sliderMaxPrice);
  const [search, setSearch] = useState(initialFilters?.search ?? '');
  const [newOnly, setNewOnly] = useState(initialFilters?.newOnly ?? false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Derived: product types (last word of leaf name, locale-aware) and themes (DB parentName).
  // parentCats → product types like "Breloki"/"Keychains" (from last word, respects current locale).
  // types → canonical theme names like "Anime"/"Gaming" (from parentName — proper nouns, language-invariant).
  const availableParentCategories = useMemo(() => {
    const productTypes = categories.map((c) => extractLeafProductType(c.name)).filter((t) => t.length > 0);
    return [...new Set(productTypes)].sort();
  }, [categories]);
  const availableTypes = useMemo(() => {
    const themes = categories
      .map((c) => c.parentNameEn ?? c.parentName)
      .filter((p): p is string => typeof p === 'string' && p.length > 0);
    return [...new Set(themes)].sort();
  }, [categories]);

  // Resolved leaf category names for API calls (intersection of type + parent selections).
  const resolvedCategories = useMemo(
    () => resolveLeafCategories(selectedTypes, selectedParentCategories, categories),
    [selectedTypes, selectedParentCategories, categories],
  );

  // Keeps latest filter values accessible inside stable callbacks without stale closure issues.
  const initialResolvedCategories = useMemo(
    () => resolveLeafCategories(initialFilters?.types ?? [], initialFilters?.parentCats ?? [], categories),
    [],
  );
  const filtersRef = useRef<FilterState>({
    category: initialResolvedCategories[0] ?? initialFilters?.category ?? '',
    categories: initialResolvedCategories,
    types: initialFilters?.types ?? [],
    parentCats: initialFilters?.parentCats ?? [],
    themes: initialFilters?.themes ?? [],
    materials: initialFilters?.materials ?? [],
    sizes: initialFilters?.sizes ?? [],
    lores: initialFilters?.lores ?? [],
    sort: initialFilters?.sort ?? 'featured',
    priceMin: initialFilters?.priceMin,
    priceMax: initialFilters?.priceMax,
    search: initialFilters?.search ?? '',
    newOnly: initialFilters?.newOnly ?? false,
  });
  const selectorTitle = selectedTypes.length > 0
    ? selectedTypes.join(', ')
    : selectedParentCategories.length > 0
      ? selectedParentCategories.join(', ')
      : selectedThemes.length > 0
        ? selectedThemes.join(', ')
        : '';
  filtersRef.current = {
    category: resolvedCategories[0] ?? '',
    categories: resolvedCategories,
    types: selectedTypes,
    parentCats: selectedParentCategories,
    themes: selectedThemes,
    materials: selectedMaterials,
    sizes: selectedSizes,
    lores: selectedLores,
    sort,
    priceMin: sliderMin > PRICE_SLIDER_MIN ? sliderMin : undefined,
    priceMax: sliderMax < sliderMaxPrice ? sliderMax : undefined,
    search,
    newOnly,
  };

  // Reflects active filters in the URL so the view is shareable and survives refresh.
  const syncUrl = useCallback((f: FilterState) => {
    const p = new URLSearchParams();
    if (f.search) p.set('q', f.search);
    if (f.newOnly) p.set('new', '1');
    if (f.types.length > 0) p.set('types', f.types.join(','));
    if (f.parentCats.length > 0) p.set('parentCats', f.parentCats.join(','));
    if (f.themes.length > 0) p.set('themes', f.themes.join(','));
    if (f.materials.length > 0) p.set('materials', f.materials.join(','));
    if (f.sizes.length > 0) p.set('sizes', f.sizes.join(','));
    if (f.lores.length > 0) p.set('lores', f.lores.join(','));
    if (f.sort && f.sort !== 'featured') p.set('sort', f.sort);
    if (f.priceMin !== undefined) p.set('priceMin', String(f.priceMin));
    if (f.priceMax !== undefined) p.set('priceMax', String(f.priceMax));
    const qs = p.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

  // Track in-flight fetches so stale responses don't overwrite newer ones.
  const fetchSeqRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Ref to the results area — used to scroll up when a filter changes.
  const resultsRef = useRef<HTMLDivElement>(null);

  const canLoadMore = source === 'mentios' && loadedCount < currentTotal;

  // Builds URLSearchParams from an explicit filter snapshot — shared by refetch and loadMore.
  const buildParams = useCallback((
    f: FilterState,
    skip: number,
    limit: number,
  ): URLSearchParams => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit), locale });
    if (f.categories.length === 1) params.set('category', f.categories[0]);
    if (f.categories.length > 1) params.set('categories', f.categories.join(','));
    if (f.themes.length > 0) params.set('themes', f.themes.join(','));
    if (f.materials.length > 0) params.set('materials', f.materials.join(','));
    if (f.sizes.length > 0) params.set('sizes', f.sizes.join(','));
    if (f.lores.length > 0) params.set('lores', f.lores.join(','));
    if (f.sort && f.sort !== 'featured') params.set('sort', f.sort);
    if (f.priceMin !== undefined) params.set('priceMin', String(f.priceMin));
    if (f.priceMax !== undefined) params.set('priceMax', String(f.priceMax));
    if (f.search) params.set('q', f.search);
    if (f.newOnly) params.set('new', '1');
    return params;
  }, [locale]);

  // Re-fetches from page 0 with an explicit filter snapshot.
  // For mentios: hits the API. For static: only updates URL (client-side filtering handles the rest).
  const refetch = useCallback(async (f: FilterState) => {
    syncUrl(f);
    if (source !== 'mentios') return;
    setIsRefetching(true);
    const seq = ++fetchSeqRef.current;
    try {
      const params = buildParams(f, 0, 48);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as { products: Product[]; total: number };
      if (seq !== fetchSeqRef.current) return;
      setAllProducts(data.products ?? []);
      setLoadedCount(data.products?.length ?? 0);
      setCurrentTotal(data.total ?? 0);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      // keep current list on error
    } finally {
      if (seq === fetchSeqRef.current) setIsRefetching(false);
    }
  }, [source, buildParams, syncUrl]);

  const handleThemeRemove = useCallback((theme: string) => {
    const nextThemes = filtersRef.current.themes.filter((value) => value !== theme);
    setSelectedThemes(nextThemes);
    refetch({ ...filtersRef.current, themes: nextThemes });
  }, [refetch]);

  const handleTypeChange = useCallback((type: string) => {
    const current = filtersRef.current.types;
    const nextTypes = current.includes(type) ? current.filter((v) => v !== type) : [...current, type];
    setSelectedTypes(nextTypes);
    const resolved = resolveLeafCategories(nextTypes, filtersRef.current.parentCats, categories);
    refetch({ ...filtersRef.current, types: nextTypes, categories: resolved, category: resolved[0] ?? '' });
  }, [refetch, categories]);

  const handleParentCatChange = useCallback((parent: string) => {
    const current = filtersRef.current.parentCats;
    const nextParents = current.includes(parent) ? current.filter((v) => v !== parent) : [...current, parent];
    setSelectedParentCategories(nextParents);
    const resolved = resolveLeafCategories(filtersRef.current.types, nextParents, categories);
    refetch({ ...filtersRef.current, parentCats: nextParents, categories: resolved, category: resolved[0] ?? '' });
  }, [refetch, categories]);

  const clearProductSelectors = useCallback(() => {
    setSelectedTypes([]);
    setSelectedParentCategories([]);
    setSelectedThemes([]);
    setSelectedMaterials([]);
    setSelectedSizes([]);
    setSelectedLores([]);
    refetch({ ...filtersRef.current, types: [], parentCats: [], category: '', categories: [], themes: [], materials: [], sizes: [], lores: [] });
  }, [refetch]);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    refetch({ ...filtersRef.current, sort: newSort });
  }, [refetch]);

  const handlePriceDrag = useCallback((min: number, max: number) => {
    setSliderMin(min);
    setSliderMax(max);
    const priceMin = min > PRICE_SLIDER_MIN ? min : undefined;
    const priceMax = max < sliderMaxPrice ? max : undefined;
    syncUrl({ ...filtersRef.current, priceMin, priceMax });
  }, [syncUrl, sliderMaxPrice]);

  const handlePriceCommit = useCallback(() => {
    const min = filtersRef.current.priceMin;
    const max = filtersRef.current.priceMax;
    refetch({ ...filtersRef.current, priceMin: min, priceMax: max });
  }, [refetch]);

  const handleMaterialChange = useCallback((material: string) => {
    const current = filtersRef.current.materials;
    const nextMaterials = current.includes(material)
      ? current.filter((v) => v !== material)
      : [...current, material];
    setSelectedMaterials(nextMaterials);
    refetch({ ...filtersRef.current, materials: nextMaterials });
  }, [refetch]);

  const handleSizeChange = useCallback((size: string) => {
    const current = filtersRef.current.sizes;
    const nextSizes = current.includes(size)
      ? current.filter((v) => v !== size)
      : [...current, size];
    setSelectedSizes(nextSizes);
    refetch({ ...filtersRef.current, sizes: nextSizes });
  }, [refetch]);

  const handleLoreChange = useCallback((lore: string) => {
    const current = filtersRef.current.lores;
    const nextLores = current.includes(lore)
      ? current.filter((v) => v !== lore)
      : [...current, lore];
    setSelectedLores(nextLores);
    refetch({ ...filtersRef.current, lores: nextLores });
  }, [refetch]);

  const handleNewOnlyChange = useCallback((value: boolean) => {
    setNewOnly(value);
    refetch({ ...filtersRef.current, newOnly: value });
  }, [refetch]);

  // URL updates immediately on every keystroke; the API fetch is debounced.
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    syncUrl({ ...filtersRef.current, search: value });
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      refetch({ ...filtersRef.current, search: value });
    }, 350);
  }, [refetch, syncUrl]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = buildParams(filtersRef.current, loadedCount, LOAD_MORE_SIZE);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = (await res.json()) as { products: Product[] };
      const newProducts = data.products ?? [];
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...newProducts.filter((p) => !existingIds.has(p.id))];
      });
      setLoadedCount((prev) => prev + newProducts.length);
    } catch {
      // keep current list on error
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, loadedCount, buildParams]);

  // Attach IntersectionObserver to the sentinel div — auto-load when it enters the viewport.
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  useEffect(() => {
    const el = sentinelRef.current;
    if (el) {
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) loadMoreRef.current(); },
        { rootMargin: '200px' },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);
  // For static source: apply all filters/sort client-side. For mentios: server already did it.
  const displayProducts = useMemo(() => {
    if (source === 'mentios') return allProducts;
    let result = allProducts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
      );
    }
    if (newOnly) result = result.filter((p) => p.isNew);
    if (resolvedCategories.length > 0) {
      const selected = new Set(resolvedCategories);
      result = result.filter((p) => selected.has(p.category));
    }
    if (selectedThemes.length > 0) {
      result = result.filter((p) => productMatchesThemes(p, selectedThemes));
    }
    if (selectedMaterials.length > 0) {
      result = result.filter((p) => productMatchesMaterials(p, selectedMaterials));
    }
    if (selectedSizes.length > 0) {
      result = result.filter((p) => productMatchesSizes(p, selectedSizes));
    }
    if (selectedLores.length > 0) {
      result = result.filter((p) => productMatchesLores(p, selectedLores));
    }
    if (sliderMin > PRICE_SLIDER_MIN) result = result.filter((p) => p.price >= sliderMin);
    if (sliderMax < sliderMaxPrice) result = result.filter((p) => p.price <= sliderMax);
    const copy = [...result];
    if (sort === 'price-asc') copy.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') copy.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') copy.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    else if (sort === 'name-asc') copy.sort((a, b) => (a.shortName ?? a.name).localeCompare(b.shortName ?? b.name));
    else if (sort === 'name-desc') copy.sort((a, b) => (b.shortName ?? b.name).localeCompare(a.shortName ?? a.name));
    else if (sort === 'category') copy.sort((a, b) => a.category.localeCompare(b.category));
    else copy.sort((a, b) => (a.shortName ?? a.name).localeCompare(b.shortName ?? b.name));
    return copy;  }, [source, allProducts, search, newOnly, resolvedCategories, selectedThemes, selectedMaterials, selectedSizes, selectedLores, sliderMin, sliderMax, sort]);

  const priceFiltered = sliderMin > PRICE_SLIDER_MIN || sliderMax < sliderMaxPrice;
  const hasFilters = selectedTypes.length > 0 || selectedParentCategories.length > 0 || selectedThemes.length > 0 || selectedMaterials.length > 0 || selectedSizes.length > 0 || selectedLores.length > 0 || priceFiltered || search !== '' || newOnly;
  const activeFilterCount =
    selectedTypes.length +
    selectedParentCategories.length +
    selectedThemes.length +
    selectedMaterials.length +
    selectedSizes.length +
    selectedLores.length +
    (priceFiltered ? 1 : 0) +
    (search ? 1 : 0) +
    (newOnly ? 1 : 0);

  // Total in-stock products across all known categories — used for the "All" button count.
  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  );

  const clearFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedParentCategories([]);
    setSelectedThemes([]);
    setSelectedMaterials([]);
    setSelectedSizes([]);
    setSelectedLores([]);
    setSliderMin(PRICE_SLIDER_MIN);
    setSliderMax(sliderMaxPrice);
    setSearch('');
    setNewOnly(false);
    refetch({ types: [], parentCats: [], category: '', categories: [], themes: [], materials: [], sizes: [], lores: [], sort: filtersRef.current.sort, priceMin: undefined, priceMax: undefined, search: '', newOnly: false });
  }, [refetch]);

  // Restore filter state when the user presses the browser back/forward button.
  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const types = parseFilterList(p.get('types'));
      const parentCats = parseFilterList(p.get('parentCats'));
      const themes = parseFilterList(p.get('themes'));
      const materials = parseFilterList(p.get('materials'));
      const sizes = parseFilterList(p.get('sizes'));
      const lores = parseFilterList(p.get('lores'));
      const sort = p.get('sort') ?? 'featured';
      const priceMin = p.has('priceMin') ? Number(p.get('priceMin')) : undefined;
      const priceMax = p.has('priceMax') ? Number(p.get('priceMax')) : undefined;
      const search = p.get('q') ?? '';
      const newOnly = p.get('new') === '1';
      const resolved = resolveLeafCategories(types, parentCats, categories);
      setSelectedTypes(types);
      setSelectedParentCategories(parentCats);
      setSelectedThemes(themes);
      setSelectedMaterials(materials);
      setSelectedSizes(sizes);
      setSelectedLores(lores);
      setSort(sort);
      setSliderMin(priceMin ?? PRICE_SLIDER_MIN);
      setSliderMax(priceMax ?? sliderMaxPrice);
      setSearch(search);
      setNewOnly(newOnly);
      refetch({ types, parentCats, category: resolved[0] ?? '', categories: resolved, themes, materials, sizes, lores, sort, priceMin, priceMax, search, newOnly });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [refetch, categories, sliderMaxPrice]);

  const filterProps = {
    selectedTypes,
    setSelectedType: handleTypeChange,
    availableTypes,
    selectedParentCategories,
    setSelectedParentCategory: handleParentCatChange,
    availableParentCategories,
    sliderMin,
    sliderMax,
    sliderAbsMax: sliderMaxPrice,
    onPriceDrag: handlePriceDrag,
    onPriceCommit: handlePriceCommit,
    selectedMaterials,
    setSelectedMaterial: handleMaterialChange,
    availableMaterials,
    selectedSizes,
    setSelectedSize: handleSizeChange,
    availableSizes,
    selectedLores,
    setSelectedLore: handleLoreChange,
    availableLores,
    newOnly,
    onNewOnly: handleNewOnlyChange,
    hasFilters,
    onClear: clearFilters,
    totalCount,
    content,
  };

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Page header */}
        <div
          className='px-6 md:px-10 py-10 md:py-14'
          style={{
            background: 'radial-gradient(circle at 50% 18%, rgba(229,183,94,0.13) 0%, transparent 32%), radial-gradient(circle at 86% 22%, rgba(201,60,47,0.08) 0%, transparent 28%), linear-gradient(145deg, #020205 0%, #060913 100%)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Breadcrumb */}
          <div className='flex items-center gap-2 mb-5 flex-wrap'>
            <a
              href={localizedHref('/')}
              className='transition-opacity hover:opacity-70'
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {col.homeBreadcrumbLabel}
            </a>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>/</span>
            {selectorTitle ? (
              <>
                <button
                  onClick={clearProductSelectors}
                  className='transition-opacity hover:opacity-70'
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {col.allProductsLabel}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem' }}>/</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.65)',
                  }}
                >
                  {selectorTitle}
                </span>
              </>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                {col.allProductsLabel}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className='type-display-xl' style={{ color: '#fff', maxWidth: '14ch' }}>
            {selectorTitle || col.allProductsLabel}
          </h1>
          <p
            className='mt-3'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            {isRefetching ? '…' : `${currentTotal} ${col.productsCountLabel}`}
          </p>
        </div>

        {/* Body */}
        <div className='flex' style={{ minHeight: 'calc(100vh - var(--nav-h))' }}>
          {/* Desktop sidebar */}
          <aside
            className='hidden md:block flex-shrink-0'
            style={{
              width: '210px',
              position: 'sticky',
              top: 'var(--nav-h)',
              height: 'calc(100vh - var(--nav-h))',
              overflowY: 'auto',
              borderRight: '1px solid var(--border)',
            }}
          >
            <SidebarFilters {...filterProps} />
          </aside>

          {/* Product grid */}
          <div className='flex-1 min-w-0 px-5 md:px-8 pt-6 pb-28 md:pb-14'>
            {/* Results bar — scroll target when filters change */}
            <div
              ref={resultsRef}
              className='flex items-center gap-3 mb-5 pb-4 flex-wrap'
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {/* Count */}
              <p
                className='flex-shrink-0'
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                {isRefetching ? '…' : (
                  <>
                    {displayProducts.length}
                    {allProducts.length < currentTotal ? ` ${col.ofLabel} ${currentTotal}` : ''}{' '}
                    {displayProducts.length === 1 ? col.resultSingular : col.resultPlural}
                  </>
                )}
              </p>

              {/* Spacer */}
              <div className='flex-1' />

              {/* Search input */}
              <div className='relative flex-shrink-0'>
                <input
                  type='text'
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={col.searchPlaceholder}
                  className='bg-transparent pb-1 pr-6 outline-none border-b border-[var(--border)] focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]'
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.05em',
                    color: 'var(--fg)',
                    width: '160px',
                  }}
                />
                {search ? (
                  <button
                    onClick={() => handleSearch('')}
                    className='absolute right-0 top-0 leading-none transition-opacity hover:opacity-70'
                    style={{ color: 'var(--muted)', fontSize: '0.7rem' }}
                  >
                    ✕
                  </button>
                ) : (
                  <svg
                    className='absolute right-0 top-0.5 pointer-events-none'
                    width='10'
                    height='10'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.8'
                    strokeLinecap='round'
                    style={{ color: 'var(--muted)' }}
                  >
                    <circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' />
                  </svg>
                )}
              </div>

              {/* Sort selector */}
              <div className='relative flex-shrink-0'>
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className='appearance-none bg-transparent border-b border-[var(--border)] focus:border-[var(--accent)] outline-none pr-5 pb-1 transition-colors cursor-pointer'
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.05em',
                    color: 'var(--muted)',
                  }}
                >
                  {col.sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} style={{ background: 'var(--card-bg)', color: 'var(--fg)' }}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg
                  className='absolute right-0 top-0.5 pointer-events-none'
                  width='10'
                  height='10'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  style={{ color: 'var(--muted)' }}
                >
                  <polyline points='6 9 12 15 18 9' />
                </svg>
              </div>

              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className='md:hidden flex items-center gap-2 transition-colors hover:text-[var(--fg)]'
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                  <line x1='4' y1='6' x2='20' y2='6' />
                  <line x1='8' y1='12' x2='16' y2='12' />
                  <line x1='12' y1='18' x2='12' y2='18' />
                </svg>
                {col.filtersLabel}
                {activeFilterCount > 0 && (
                  <span
                    className='w-4 h-4 rounded-full text-[10px] flex items-center justify-center'
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className='flex flex-wrap gap-2 mb-5'>
                {search && (
                  <button
                    onClick={() => handleSearch('')}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    &ldquo;{search}&rdquo;
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                )}
                {newOnly && (
                  <button
                    onClick={() => handleNewOnlyChange(false)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.newArrivalsLabel}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                )}
                {selectedTypes.map((theme) => (
                  <button
                    key={`theme-cat-${theme}`}
                    onClick={() => handleTypeChange(theme)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.universeLabel}: {theme}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {selectedParentCategories.map((productType) => (
                  <button
                    key={`ptype-${productType}`}
                    onClick={() => handleParentCatChange(productType)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.typeLabel}: {productType}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {selectedThemes.map((theme) => (
                  <button
                    key={`theme-${theme}`}
                    onClick={() => handleThemeRemove(theme)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    Theme: {theme}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {selectedMaterials.map((material) => (
                  <button
                    key={`material-${material}`}
                    onClick={() => handleMaterialChange(material)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.materialLabel}: {material}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {selectedSizes.map((size) => (
                  <button
                    key={`size-${size}`}
                    onClick={() => handleSizeChange(size)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.sizeLabel}: {size}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {selectedLores.map((lore) => (
                  <button
                    key={`lore-${lore}`}
                    onClick={() => handleLoreChange(lore)}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.loreLabel}: {lore}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                ))}
                {priceFiltered && (
                  <button
                    onClick={() => {
                      setSliderMin(PRICE_SLIDER_MIN);
                      setSliderMax(sliderMaxPrice);
                      refetch({ ...filtersRef.current, priceMin: undefined, priceMax: undefined });
                    }}
                    className='flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]'
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--accent)',
                      border: '1px solid rgba(var(--accent-rgb),0.4)',
                      background: 'rgba(var(--accent-rgb),0.07)',
                      padding: '0.25rem 0.6rem',
                    }}
                  >
                    {col.priceLabel}: {formatPrice(sliderMin, locale)} – {formatPrice(sliderMax, locale)}
                    <svg width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
                      <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isRefetching ? (
              <CatalogSkeleton count={Math.min(allProducts.length || 10, 20)} />
            ) : displayProducts.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-32 gap-4'>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.5rem',
                    fontWeight: 300,
                    color: 'var(--muted)',
                  }}
                >
                  {col.noResultsTitle}
                </p>
                {hasFilters && (
                  <button className='btn-ghost' onClick={clearFilters}>
                    {col.clearFiltersLabel}
                  </button>
                )}
              </div>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9'>
                {displayProducts.map((product, index) => (
                  <CatalogCard key={product.id} product={product} locale={locale} addToBagLabel={col.quickAddLabel} priority={index < 4} />
                ))}
              </div>
            )}

            {canLoadMore && (
              <div ref={sentinelRef} className='flex flex-col items-center mt-14 gap-3' aria-hidden='true'>
                {isLoadingMore && (
                  <svg
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    style={{ animation: 'spin 0.9s linear infinite', color: 'var(--muted)' }}
                  >
                    <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div className='md:hidden fixed inset-0 z-50 flex'>
            <div
              className='absolute inset-0'
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div
              className='relative ml-auto w-72 h-full overflow-y-auto'
              style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border)' }}
            >
              <div
                className='flex items-center justify-between px-5 py-4'
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--fg)',
                  }}
                >
                  {col.filtersLabel}
                </span>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  style={{ color: 'var(--muted)', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              </div>
              <SidebarFilters {...filterProps} onClose={() => setMobileFiltersOpen(false)} />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
