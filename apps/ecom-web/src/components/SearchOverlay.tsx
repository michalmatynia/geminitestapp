/* eslint-disable @typescript-eslint/explicit-function-return-type,@typescript-eslint/no-misused-promises,@typescript-eslint/no-unnecessary-condition,@typescript-eslint/strict-boolean-expressions,complexity,consistent-return,max-lines,max-lines-per-function,no-nested-ternary */
'use client';

import { useState, useEffect, useRef, useCallback, type JSX } from 'react';
import { PRODUCTS } from '@/data/products';
import type { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useSiteContent } from '@/context/SiteContentContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { ProductImage } from '@/components/ProductImage';
import { resultCountWord, formatPrice } from '@/lib/locales';

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

function useProductSearch(query: string, locale: string) {
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Show instant static baseline only for English; localized catalog data
    // arrives from the API and avoids a Polish UI briefly flashing English copy.
    if (locale === 'en') {
      const ql = q.toLowerCase();
      setResults(
        PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(ql) ||
            p.category.toLowerCase().includes(ql) ||
            p.description.toLowerCase().includes(ql),
        ),
      );
    } else {
      setResults([]);
    }

    setIsLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?q=${encodeURIComponent(q)}&limit=8&locale=${locale}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json() as { products: Product[] };
        setResults(data.products ?? []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // keep static baseline on error
        }
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);

  return { results, isLoading };
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps): JSX.Element {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useCart();
  const { toast } = useToast();
  const { search } = useSiteContent();
  const locale = useLocale();
  const localizedHref = useLocalizedHref();

  const { results, isLoading } = useProductSearch(query, locale);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleQuickAdd = useCallback((product: Product, e: React.MouseEvent) => {
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
    toast({ type: 'success', title: search.addedToastTitle, message: product.shortName ?? product.name });
  }, [addItem, search.addedToastTitle, toast]);

  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;

  return (
    <>
      {/* Backdrop */}
      <div
        className='fixed inset-0 z-50'
        style={{
          background: 'var(--modal-scrim)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Panel */}
      <div
        role='dialog'
        aria-label={search.dialogAriaLabel}
        aria-modal='true'
        className='fixed top-0 left-0 right-0 z-50'
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          transform: open ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
          willChange: 'transform',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input row */}
        <div
          className='flex items-center gap-4 px-8 md:px-16'
          style={{ borderBottom: '1px solid var(--border)', paddingTop: 'calc(var(--nav-h) + 1.5rem)', paddingBottom: '1.5rem' }}
        >
          {isLoading ? (
            <svg
              width='20' height='20' viewBox='0 0 24 24' fill='none'
              stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'
              style={{ color: 'var(--accent)', flexShrink: 0, animation: 'spin 0.9s linear infinite' }}
            >
              <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
            </svg>
          ) : (
            <svg
              width='20' height='20' viewBox='0 0 24 24' fill='none'
              stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'
              style={{ color: 'var(--muted)', flexShrink: 0 }}
            >
              <circle cx='11' cy='11' r='7' />
              <path d='m21 21-4.35-4.35' />
            </svg>
          )}
          <input
            ref={inputRef}
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={search.placeholder}
            autoComplete='off'
            aria-label={search.inputAriaLabel}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 3vw, 2rem)',
              fontWeight: 500,
              color: 'var(--fg)',
            }}
          />
          <button
            onClick={onClose}
            aria-label={search.closeAriaLabel}
            className='type-label flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors'
            style={{ color: 'var(--muted)', flexShrink: 0 }}
          >
            <span>{search.closeLabel}</span>
            <kbd
              className='px-1.5 py-0.5 text-[10px]'
              style={{ border: '1px solid var(--border)', borderRadius: '2px' }}
            >
              {search.shortcutLabel}
            </kbd>
          </button>
        </div>

        {/* Results / suggestions */}
        <div className='overflow-y-auto flex-1 px-8 md:px-16 py-8'>
          {!showResults ? (
            /* Trending suggestions */
            <div>
              <p className='type-label mb-5' style={{ color: 'var(--muted)' }}>
                {search.trendingLabel}
              </p>
              <div className='flex flex-wrap gap-3'>
                {search.trendingSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className='type-label px-4 py-2 hover:border-[var(--fg)] hover:text-[var(--fg)] transition-colors'
                    style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
                  >
                    {term}
                  </button>
                ))}
              </div>

              <div className='mt-10'>
                <p className='type-label mb-5' style={{ color: 'var(--muted)' }}>
                  {search.browseCollectionsLabel}
                </p>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                  {search.collectionCards.map((cat) => (
                    <a
                      key={cat.slug}
                      href={localizedHref(cat.href)}
                      onClick={onClose}
                      className='relative overflow-hidden block'
                      style={{ aspectRatio: '3/2' }}
                    >
                      <div
                        className='absolute inset-0 transition-transform duration-500 hover:scale-105'
                        style={{ background: cat.gradient }}
                      />
                      <div className='absolute inset-0 flex items-end p-4'>
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'var(--on-media)',
                          }}
                        >
                          {cat.label}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 && !isLoading ? (
            /* No results */
            <div className='py-16 text-center'>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}
              >
                {search.noResultsPrefix} &ldquo;{query}&rdquo;
              </p>
              <p className='type-label' style={{ color: 'var(--muted)' }}>
                {search.noResultsHelp}
              </p>
            </div>
          ) : (
            /* Results grid */
            <div>
              <div className='flex items-center gap-3 mb-6'>
                <p className='type-label' style={{ color: 'var(--muted)' }}>
                  {isLoading
                    ? search.loadingResultsLabel
                    : `${results.length} ${resultCountWord(results.length, locale, search.resultSingular, search.resultPlural)} ${search.resultsForLabel} “${query}”`}
                </p>
                {isLoading && (
                  <span
                    className='type-label px-2 py-0.5'
                    style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}
                  >
                    {search.liveLabel}
                  </span>
                )}
              </div>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-5'>
                {results.slice(0, 8).map((p) => (
                  <a
                    key={p.id}
                    href={localizedHref(`/products/${p.slug}`)}
                    onClick={onClose}
                    className='group block'
                    style={{ animation: 'searchSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
                  >
                    <div
                      className='relative overflow-hidden mb-3'
                      style={{ aspectRatio: '3/4' }}
                    >
                      <ProductImage
                        imageUrl={p.imageUrl}
                        gradient={p.gradient}
                        alt={p.shortName ?? p.name}
                        className='absolute inset-0 transition-transform duration-700 group-hover:scale-105'
                        sizes='(max-width: 768px) 50vw, 25vw'
                      />
                      <div className='absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10' />
                      {p.tag && (
                        <div className='absolute top-2 left-2'>
                          <span className='type-label px-2 py-0.5 text-[10px]' style={{ background: 'var(--accent)', color: '#fff' }}>
                            {p.tag}
                          </span>
                        </div>
                      )}
                      <div className='absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0'>
                        <button
                          className='btn-primary w-full justify-center text-[10px]'
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)', padding: '0.5rem 1rem' }}
                          onClick={(e) => handleQuickAdd(p, e)}
                        >
                          {search.quickAddLabel}
                        </button>
                      </div>
                    </div>
                    <div className='type-label mb-0.5' style={{ color: 'var(--muted)' }}>{p.category}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 300, color: 'var(--fg)' }}>
                      {p.shortName ?? p.name}
                    </div>
                    <div className='type-price mt-0.5' style={{ color: 'var(--muted)' }}>{formatPrice(p.price, locale)}</div>
                  </a>
                ))}
              </div>

              {results.length > 8 && (
                <div className='mt-8 text-center'>
                  <a
                    href={localizedHref(`/products?q=${encodeURIComponent(query.trim())}`)}
                    onClick={onClose}
                    className='btn-ghost'
                  >
                    {search.viewAllPrefix} {results.length} {resultCountWord(results.length, locale, search.resultSingular, search.resultPlural)}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
