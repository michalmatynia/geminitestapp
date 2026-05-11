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
import { useCart } from '@/context/CartContext';

const LOAD_MORE_SIZE = 24;

function CatalogSkeleton({ count = 10 }: { count?: number }): JSX.Element {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div
            className="w-full mb-2 animate-pulse"
            style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)' }}
          />
          <div className="animate-pulse mb-1.5" style={{ height: '0.55rem', width: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <div className="animate-pulse mb-1" style={{ height: '0.7rem', width: '80%', background: 'rgba(255,255,255,0.06)' }} />
          <div className="animate-pulse" style={{ height: '0.55rem', width: '30%', background: 'rgba(255,255,255,0.04)' }} />
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

  const handleAddToBasket = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      size: '',
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    openCart();
  };

  return (
    <a href={localizedHref(`/products/${product.slug}`)} className="group block">
      {/* Image with slide-up "Add to basket" panel on hover */}
      <div className="relative w-full overflow-hidden mb-2" style={{ aspectRatio: '1/1' }}>
        <ProductImage
          imageUrl={product.imageUrl}
          gradient={product.gradient}
          alt={product.shortName ?? product.name}
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          fit="cover"
          position="center"
          priority={priority}
        />
        {/* Hover panel — slides up from bottom of image */}
        <div
          className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
          style={{ background: 'rgba(4,3,20,0.82)', backdropFilter: 'blur(6px)' }}
        >
          <button
            onClick={handleAddToBasket}
            className="w-full py-3 transition-colors hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.1)]"
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
        <div className="mb-1.5">
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
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>
        {formatPrice(product.price, locale)}
      </div>
    </a>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="mb-7">
      <div
        className="mb-3"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg)',
        }}
      >
        {title}
      </div>
      {children}
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
      className="flex items-center gap-1.5 w-full text-left transition-colors hover:text-[var(--fg)]"
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
  sort,
  setSort,
  selectedCategories,
  setSelectedCategory,
  filterPrice,
  setFilterPrice,
  search,
  onSearch,
  newOnly,
  onNewOnly,
  hasFilters,
  onClear,
  onClose,
  totalCount,
  content,
  categories,
}: {
  sort: string;
  setSort: (v: string) => void;
  selectedCategories: string[];
  setSelectedCategory: (v: string) => void;
  filterPrice: string;
  setFilterPrice: (v: string) => void;
  search: string;
  onSearch: (v: string) => void;
  newOnly: boolean;
  onNewOnly: (v: boolean) => void;
  hasFilters: boolean;
  onClear: () => void;
  onClose?: () => void;
  totalCount: number;
  content: ProductsContent;
  categories: Array<{ id: string; name: string; count: number } & ProductCategoryDisplayOption>;
}): JSX.Element {
  const col = content.collection;

  const wrap = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); onClose?.(); };

  return (
    <div className="px-5 py-6">
      <div className="flex items-center justify-between mb-6">
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
            }}
          >
            {col.clearAllLabel}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-7">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={col.searchPlaceholder}
            className="w-full bg-transparent pb-1.5 pr-6 outline-none border-b border-[var(--border)] focus:border-[var(--accent)] transition-colors placeholder:text-[var(--muted)]"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              letterSpacing: '0.06em',
              color: 'var(--fg)',
            }}
          />
          {search ? (
            <button
              onClick={() => { onSearch(''); onClose?.(); }}
              className="absolute right-0 top-0 leading-none transition-opacity hover:opacity-70"
              style={{ color: 'var(--muted)', fontSize: '0.7rem' }}
            >
              ✕
            </button>
          ) : (
            <svg
              className="absolute right-0 top-0.5 pointer-events-none"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              style={{ color: 'var(--muted)' }}
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </div>
      </div>

      <FilterSection title={col.sortLabel}>
        <div className="space-y-0.5">
          {col.sortOptions.map((opt) => (
            <FilterButton key={opt.value} active={sort === opt.value} onClick={() => wrap(setSort)(opt.value)}>
              {opt.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>

      {/* New arrivals toggle */}
      <div className="mb-7">
        <FilterButton active={newOnly} onClick={() => { onNewOnly(!newOnly); onClose?.(); }}>
          {col.newArrivalsLabel}
        </FilterButton>
      </div>

      <FilterSection title={col.categoryLabel}>
        <div className="space-y-0.5">
          <FilterButton active={selectedCategories.length === 0} onClick={() => wrap(setSelectedCategory)('')}>
            <span className="flex-1 min-w-0 truncate">{col.categoryAllLabel}</span>
            {totalCount > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.56rem',
                  color: 'var(--muted)',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              >
                {totalCount}
              </span>
            )}
          </FilterButton>
          {categories.map((cat) => (
            <FilterButton
              key={cat.id}
              active={selectedCategories.includes(cat.name)}
              onClick={() => wrap(setSelectedCategory)(cat.name)}
            >
              <span className="flex-1 min-w-0 truncate">{cat.name}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.56rem',
                  color: 'var(--muted)',
                  opacity: 0.6,
                  flexShrink: 0,
                }}
              >
                {cat.count}
              </span>
            </FilterButton>
          ))}
        </div>
      </FilterSection>

      <FilterSection title={col.priceLabel}>
        <div className="space-y-0.5">
          {col.priceRanges.map((range) => (
            <FilterButton
              key={range.label}
              active={filterPrice === range.label}
              onClick={() => wrap(setFilterPrice)(filterPrice === range.label ? '' : range.label)}
            >
              {range.label}
            </FilterButton>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}

type FilterState = {
  category: string;
  categories: string[];
  themes: string[];
  sort: string;
  priceLabel: string;
  search: string;
  newOnly: boolean;
};

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
}: {
  products: Product[];
  total: number;
  source?: 'mentios' | 'static';
  content: ProductsContent;
  categories: Array<{ id: string; name: string; count: number } & ProductCategoryDisplayOption>;
  initialFilters?: FilterState;
}): JSX.Element {
  const col = content.collection;
  const locale = useLocale();
  const localizedHref = useLocalizedHref();

  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [loadedCount, setLoadedCount] = useState(initialProducts.length);
  const [currentTotal, setCurrentTotal] = useState(total);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  const [sort, setSort] = useState(initialFilters?.sort ?? 'featured');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialFilters?.categories?.length
      ? initialFilters.categories
      : initialFilters?.category
        ? [initialFilters.category]
        : [],
  );
  const [selectedThemes, setSelectedThemes] = useState<string[]>(initialFilters?.themes ?? []);
  const [filterPrice, setFilterPrice] = useState(initialFilters?.priceLabel ?? '');
  const [search, setSearch] = useState(initialFilters?.search ?? '');
  const [newOnly, setNewOnly] = useState(initialFilters?.newOnly ?? false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Keeps latest filter values accessible inside stable callbacks without stale closure issues.
  const filtersRef = useRef<FilterState>({
    category: initialFilters?.category ?? '',
    categories: initialFilters?.categories?.length
      ? initialFilters.categories
      : initialFilters?.category
        ? [initialFilters.category]
        : [],
    themes: initialFilters?.themes ?? [],
    sort: initialFilters?.sort ?? 'featured',
    priceLabel: initialFilters?.priceLabel ?? '',
    search: initialFilters?.search ?? '',
    newOnly: initialFilters?.newOnly ?? false,
  });
  const selectedCategory = selectedCategories.length === 1 ? selectedCategories[0] : '';
  const categorySelectorTitle = getCategorySelectorTitle(selectedCategories, categories);
  const selectorTitle = selectedCategories.length > 0
    ? categorySelectorTitle
    : selectedThemes.length > 0
      ? selectedThemes.join(', ')
      : '';
  filtersRef.current = {
    category: selectedCategory,
    categories: selectedCategories,
    themes: selectedThemes,
    sort,
    priceLabel: filterPrice,
    search,
    newOnly,
  };

  // Reflects active filters in the URL so the view is shareable and survives refresh.
  const syncUrl = useCallback((f: FilterState) => {
    const p = new URLSearchParams();
    if (f.search) p.set('q', f.search);
    if (f.newOnly) p.set('new', '1');
    if (f.categories.length === 1) p.set('category', f.categories[0]);
    if (f.categories.length > 1) p.set('categories', f.categories.join(','));
    if (f.themes.length > 0) p.set('themes', f.themes.join(','));
    if (f.sort && f.sort !== 'featured') p.set('sort', f.sort);
    if (f.priceLabel) p.set('price', encodeURIComponent(f.priceLabel));
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
    if (f.sort && f.sort !== 'featured') params.set('sort', f.sort);
    const range = col.priceRanges.find((r) => r.label === f.priceLabel);
    if (range) {
      params.set('priceMin', String(range.min));
      if (range.max != null) params.set('priceMax', String(range.max));
    }
    if (f.search) params.set('q', f.search);
    if (f.newOnly) params.set('new', '1');
    return params;
  }, [locale, col.priceRanges]);

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

  const handleCategoryChange = useCallback((category: string) => {
    const current = filtersRef.current.categories;
    const nextCategories = category
      ? current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category]
      : [];
    setSelectedCategories(nextCategories);
    refetch({
      ...filtersRef.current,
      category: nextCategories.length === 1 ? nextCategories[0] : '',
      categories: nextCategories,
    });
  }, [refetch]);

  const clearProductSelectors = useCallback(() => {
    setSelectedCategories([]);
    setSelectedThemes([]);
    refetch({ ...filtersRef.current, category: '', categories: [], themes: [] });
  }, [refetch]);

  const handleSortChange = useCallback((newSort: string) => {
    setSort(newSort);
    refetch({ ...filtersRef.current, sort: newSort });
  }, [refetch]);

  const handlePriceChange = useCallback((newPrice: string) => {
    setFilterPrice(newPrice);
    refetch({ ...filtersRef.current, priceLabel: newPrice });
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
    if (selectedCategories.length > 0) {
      const selected = new Set(selectedCategories);
      result = result.filter((p) => selected.has(p.category));
    }
    if (selectedThemes.length > 0) {
      result = result.filter((p) => productMatchesThemes(p, selectedThemes));
    }
    if (filterPrice) {
      const range = col.priceRanges.find((r) => r.label === filterPrice);
      if (range) result = result.filter((p) => p.price >= range.min && (range.max == null || p.price < range.max));
    }
    const copy = [...result];
    if (sort === 'price-asc') copy.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') copy.sort((a, b) => b.price - a.price);
    else if (sort === 'newest') copy.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    return copy;
  }, [source, allProducts, search, newOnly, selectedCategories, selectedThemes, filterPrice, sort, col.priceRanges]);

  const hasFilters = selectedCategories.length > 0 || selectedThemes.length > 0 || filterPrice !== '' || search !== '' || newOnly;
  const activeFilterCount =
    selectedCategories.length +
    selectedThemes.length +
    (filterPrice ? 1 : 0) +
    (search ? 1 : 0) +
    (newOnly ? 1 : 0);

  // Total in-stock products across all known categories — used for the "All" button count.
  const totalCount = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  );

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedThemes([]);
    setFilterPrice('');
    setSearch('');
    setNewOnly(false);
    refetch({ category: '', categories: [], themes: [], sort: filtersRef.current.sort, priceLabel: '', search: '', newOnly: false });
  }, [refetch]);

  // Restore filter state when the user presses the browser back/forward button.
  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const category = p.get('category') ?? '';
      const categories = uniqueFilterValues([...parseFilterList(p.get('categories')), ...(category ? [category] : [])]);
      const themes = parseFilterList(p.get('themes'));
      const sort = p.get('sort') ?? 'featured';
      const priceLabel = p.has('price') ? decodeURIComponent(p.get('price')!) : '';
      const search = p.get('q') ?? '';
      const newOnly = p.get('new') === '1';
      setSelectedCategories(categories);
      setSelectedThemes(themes);
      setSort(sort);
      setFilterPrice(priceLabel);
      setSearch(search);
      setNewOnly(newOnly);
      refetch({ category: categories.length === 1 ? categories[0] : '', categories, themes, sort, priceLabel, search, newOnly });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [refetch]);

  const filterProps = {
    sort,
    setSort: handleSortChange,
    selectedCategory,
    selectedCategories,
    setSelectedCategory: handleCategoryChange,
    filterPrice,
    setFilterPrice: handlePriceChange,
    search,
    onSearch: handleSearch,
    newOnly,
    onNewOnly: handleNewOnlyChange,
    hasFilters,
    onClear: clearFilters,
    totalCount,
    content,
    categories,
  };

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Page header */}
        <div
          className="px-6 md:px-10 py-10 md:py-14"
          style={{
            background: 'radial-gradient(circle at 50% 18%, rgba(229,183,94,0.13) 0%, transparent 32%), radial-gradient(circle at 86% 22%, rgba(201,60,47,0.08) 0%, transparent 28%), linear-gradient(145deg, #020205 0%, #060913 100%)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <a
              href={localizedHref('/')}
              className="transition-opacity hover:opacity-70"
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
                  className="transition-opacity hover:opacity-70"
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
          <h1 className="type-display-xl" style={{ color: '#fff', maxWidth: '14ch' }}>
            {selectorTitle || col.allProductsLabel}
          </h1>
          <p
            className="mt-3"
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
        <div className="flex" style={{ minHeight: 'calc(100vh - var(--nav-h))' }}>
          {/* Desktop sidebar */}
          <aside
            className="hidden md:block flex-shrink-0"
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
          <div className="flex-1 min-w-0 px-5 md:px-8 pt-6 pb-28 md:pb-14">
            {/* Results bar — scroll target when filters change */}
            <div
              ref={resultsRef}
              className="flex items-center justify-between mb-5 pb-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <p
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

              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="md:hidden flex items-center gap-2 transition-colors hover:text-[var(--fg)]"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="12" y1="18" x2="12" y2="18" />
                </svg>
                {col.filtersLabel}
                {activeFilterCount > 0 && (
                  <span
                    className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                {search && (
                  <button
                    onClick={() => handleSearch('')}
                    className="flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]"
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
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {newOnly && (
                  <button
                    onClick={() => handleNewOnlyChange(false)}
                    className="flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]"
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
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {selectedCategories.map((category) => (
                  <button
                    key={`category-${category}`}
                    onClick={() => handleCategoryChange(category)}
                    className="flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]"
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
                    {col.categoryLabel}: {category}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ))}
                {selectedThemes.map((theme) => (
                  <button
                    key={`theme-${theme}`}
                    onClick={() => handleThemeRemove(theme)}
                    className="flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]"
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
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                ))}
                {filterPrice && (
                  <button
                    onClick={() => handlePriceChange('')}
                    className="flex items-center gap-1.5 transition-colors hover:border-[var(--accent)]"
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
                    {col.priceLabel}: {filterPrice}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {isRefetching ? (
              <CatalogSkeleton count={Math.min(allProducts.length || 10, 20)} />
            ) : displayProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
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
                  <button className="btn-ghost" onClick={clearFilters}>
                    {col.clearFiltersLabel}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9">
                {displayProducts.map((product, index) => (
                  <CatalogCard key={product.id} product={product} locale={locale} addToBagLabel={col.quickAddLabel} priority={index < 4} />
                ))}
              </div>
            )}

            {canLoadMore && (
              <div className="flex flex-col items-center mt-14 gap-3">
                <button
                  className="btn-ghost px-12 flex items-center gap-3"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  style={{ opacity: isLoadingMore ? 0.6 : 1 }}
                >
                  {isLoadingMore ? (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        style={{ animation: 'spin 0.9s linear infinite' }}
                      >
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      {col.loadingLabel}
                    </>
                  ) : (
                    `${col.loadMorePrefix} (${currentTotal - loadedCount} ${col.remainingLabel})`
                  )}
                </button>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.08em',
                    color: 'var(--muted)',
                  }}
                >
                  {col.showingLabel} {allProducts.length} {col.ofLabel} {currentTotal}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.6)' }}
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div
              className="relative ml-auto w-72 h-full overflow-y-auto"
              style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border)' }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
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
