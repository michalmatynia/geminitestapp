'use client';

import { useState, useEffect, useRef, type JSX } from 'react';
import { PRODUCTS } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';

const TRENDING = ['Linen', 'Marble', 'Cognac', 'Wool', 'Vessel'];

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchOverlay({ open, onClose }: SearchOverlayProps): JSX.Element {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q.length >= 2
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    : [];

  const handleQuickAdd = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const p = PRODUCTS.find((x) => x.id === productId);
    if (!p) return;
    addItem({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      price: p.price,
      priceDisplay: p.priceDisplay,
      size: p.sizes[1] ?? '',
      gradient: p.gradient,
      quantity: 1,
    });
    toast({ type: 'success', title: 'Added to bag', message: p.name });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          animation: open ? 'overlayFade 0.3s ease both' : undefined,
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Search"
        aria-modal="true"
        className="fixed top-0 left-0 right-0 z-50"
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
          className="flex items-center gap-4 px-8 md:px-16"
          style={{ borderBottom: '1px solid var(--border)', paddingTop: 'calc(var(--nav-h) + 1.5rem)', paddingBottom: '1.5rem' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ color: 'var(--muted)', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search objects, materials, categories…"
            autoComplete="off"
            aria-label="Search"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.25rem, 3vw, 2rem)',
              fontWeight: 300,
              color: 'var(--fg)',
            }}
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="type-label flex items-center gap-1.5 hover:text-[var(--fg)] transition-colors"
            style={{ color: 'var(--muted)', flexShrink: 0 }}
          >
            <span>Close</span>
            <kbd
              className="px-1.5 py-0.5 text-[10px]"
              style={{ border: '1px solid var(--border)', borderRadius: '2px' }}
            >
              Esc
            </kbd>
          </button>
        </div>

        {/* Results / suggestions */}
        <div className="overflow-y-auto flex-1 px-8 md:px-16 py-8">
          {q.length < 2 ? (
            /* Trending suggestions */
            <div>
              <p className="type-label mb-5" style={{ color: 'var(--muted)' }}>
                Trending searches
              </p>
              <div className="flex flex-wrap gap-3">
                {TRENDING.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="type-label px-4 py-2 hover:border-[var(--fg)] hover:text-[var(--fg)] transition-colors"
                    style={{
                      border: '1px solid var(--border)',
                      color: 'var(--muted)',
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Quick category links */}
              <div className="mt-10">
                <p className="type-label mb-5" style={{ color: 'var(--muted)' }}>
                  Browse collections
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { slug: 'womenswear', label: 'Womenswear', gradient: 'linear-gradient(135deg, #E8DFCF 0%, #C4B09A 100%)' },
                    { slug: 'menswear', label: 'Menswear', gradient: 'linear-gradient(135deg, #1C1812 0%, #2E261E 100%)' },
                    { slug: 'objects', label: 'Objects', gradient: 'linear-gradient(135deg, #C4BDB4 0%, #A09890 100%)' },
                    { slug: 'accessories', label: 'Accessories', gradient: 'linear-gradient(135deg, #8B5E3C 0%, #4A2D18 100%)' },
                  ].map((cat) => (
                    <a
                      key={cat.slug}
                      href={`/collections/${cat.slug}`}
                      onClick={onClose}
                      className="relative overflow-hidden block"
                      style={{ aspectRatio: '3/2' }}
                    >
                      <div
                        className="absolute inset-0 transition-transform duration-500 hover:scale-105"
                        style={{ background: cat.gradient }}
                      />
                      <div className="absolute inset-0 flex items-end p-4">
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1rem',
                            fontWeight: 300,
                            color: '#fff',
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
          ) : results.length === 0 ? (
            /* No results */
            <div className="py-16 text-center">
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="type-label" style={{ color: 'var(--muted)' }}>
                Try a different term or browse our collections
              </p>
            </div>
          ) : (
            /* Results */
            <div>
              <p className="type-label mb-6" style={{ color: 'var(--muted)' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {results.slice(0, 8).map((p) => (
                  <a
                    key={p.id}
                    href={`/products/${p.slug}`}
                    onClick={onClose}
                    className="group block"
                    style={{ animation: 'searchSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
                  >
                    <div
                      className="relative overflow-hidden mb-3"
                      style={{ aspectRatio: '3/4', background: p.gradient }}
                    >
                      <div className="absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
                      {p.tag && (
                        <div className="absolute top-2 left-2">
                          <span className="type-label px-2 py-0.5 text-[10px]" style={{ background: 'var(--accent)', color: '#fff' }}>
                            {p.tag}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        <button
                          className="btn-primary w-full justify-center text-[10px]"
                          style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)', padding: '0.5rem 1rem' }}
                          onClick={(e) => handleQuickAdd(p.id, e)}
                        >
                          Quick Add
                        </button>
                      </div>
                    </div>
                    <div className="type-label mb-0.5" style={{ color: 'var(--muted)' }}>{p.category}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 300, color: 'var(--fg)' }}>
                      {p.name}
                    </div>
                    <div className="type-price mt-0.5" style={{ color: 'var(--muted)' }}>{p.priceDisplay}</div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
