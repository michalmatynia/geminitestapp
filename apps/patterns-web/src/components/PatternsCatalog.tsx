'use client';

import {
  ArrowUpRight,
  Download,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useMemo, useState, type ChangeEvent, type JSX } from 'react';
import { PatternPreview } from '@/components/PatternPreview';
import type {
  PatternCatalogSource,
  PatternCategory,
  PatternLicenseId,
  PatternProduct,
} from '@/lib/types';

type PatternsCatalogProps = {
  patterns: PatternProduct[];
  source: PatternCatalogSource;
};

type CartLine = {
  id: string;
  pattern: PatternProduct;
  licenseId: PatternLicenseId;
  quantity: number;
};

type DownloadLink = {
  patternId: string;
  name: string;
  format: 'SVG';
  href: string;
};

type SortMode = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';

const categoryLabels: Record<PatternCategory, string> = {
  architecture: 'Architecture',
  botanical: 'Botanical',
  editorial: 'Editorial',
  interior: 'Interior',
  textile: 'Textile',
};

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const formatDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function getLicense(product: PatternProduct, licenseId: PatternLicenseId) {
  return (
    product.licenses.find((license) => license.id === licenseId) ??
    product.licenses.find((license) => license.id === product.defaultLicense) ??
    product.licenses[0]
  );
}

function formatUpdated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently updated';
  return formatDate.format(date);
}

export function PatternsCatalog({ patterns, source }: PatternsCatalogProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PatternCategory | 'all'>('all');
  const [activeLicense, setActiveLicense] = useState<PatternLicenseId>('studio');
  const [sort, setSort] = useState<SortMode>('featured');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePattern, setActivePattern] = useState<PatternProduct | null>(null);
  const [email, setEmail] = useState('');
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [orderBusy, setOrderBusy] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(patterns.map((pattern) => pattern.category))).sort(),
    [patterns]
  );

  const filteredPatterns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = patterns.filter((pattern) => {
      const categoryMatch = category === 'all' || pattern.category === category;
      const text = [
        pattern.name,
        pattern.collection,
        pattern.edition,
        pattern.description,
        pattern.category,
        ...pattern.tags,
      ].join(' ').toLowerCase();
      return categoryMatch && (normalizedQuery.length === 0 || text.includes(normalizedQuery));
    });

    return result.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'newest') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sort === 'price-asc') return getLicense(a, activeLicense).price - getLicense(b, activeLicense).price;
      if (sort === 'price-desc') return getLicense(b, activeLicense).price - getLicense(a, activeLicense).price;
      return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);
    });
  }, [activeLicense, category, patterns, query, sort]);

  const subtotal = cart.reduce((sum, line) => {
    const license = getLicense(line.pattern, line.licenseId);
    return sum + license.price * line.quantity;
  }, 0);

  const addToCart = (pattern: PatternProduct): void => {
    const license = getLicense(pattern, activeLicense);
    const id = `${pattern.id}:${license.id}`;
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) {
        return current.map((line) =>
          line.id === id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { id, pattern, licenseId: license.id, quantity: 1 }];
    });
    setCartOpen(true);
    setOrderStatus(null);
    setDownloadLinks([]);
  };

  const updateQuantity = (lineId: string, delta: number): void => {
    setCart((current) =>
      current
        .map((line) =>
          line.id === lineId ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line
        )
        .filter((line) => line.quantity > 0)
    );
    setOrderStatus(null);
    setDownloadLinks([]);
  };

  const removeLine = (lineId: string): void => {
    setCart((current) => current.filter((line) => line.id !== lineId));
    setOrderStatus(null);
    setDownloadLinks([]);
  };

  const createOrder = async (): Promise<void> => {
    setOrderBusy(true);
    setOrderStatus(null);
    setDownloadLinks([]);
    try {
      const response = await fetch('/api/download-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          items: cart.map((line) => ({
            patternId: line.pattern.id,
            licenseId: line.licenseId,
            quantity: line.quantity,
          })),
        }),
      });
      const payload = (await response.json()) as {
        order?: { code: string };
        downloads?: DownloadLink[];
        error?: string;
      };
      if (!response.ok) {
        setOrderStatus(payload.error ?? 'Unable to create order.');
        return;
      }
      setDownloadLinks(payload.downloads ?? []);
      setOrderStatus(`Order ${payload.order?.code ?? ''} is ready in the local database.`);
    } catch {
      setOrderStatus('Unable to reach the local order endpoint.');
    } finally {
      setOrderBusy(false);
    }
  };

  const sourceLabel = source === 'mongo' ? 'local database' : 'seed preview';

  return (
    <>
      <nav className="top patterns-top" id="topnav">
        <div className="nav-row">
          <a href="/" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">Milk Bar Patterns</span>
            <span className="brand-sub">/ vector archive</span>
          </a>
          <div className="nav-links">
            <a href="#catalog">catalog</a>
            <a href="#licenses">licenses</a>
            <a href="#orders">orders</a>
          </div>
          <div className="nav-end">
            <button
              type="button"
              className="nav-icon-btn"
              aria-label="Open download basket"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={17} strokeWidth={1.6} />
              <span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="patterns-page">
        <section className="catalog-open wrap" id="catalog">
          <div className="catalog-heading">
            <div>
              <div className="label">pattern catalog / {sourceLabel}</div>
              <h1>Vector patterns for studios, interiors, and quiet printed matter.</h1>
            </div>
            <button
              type="button"
              className="filter-toggle"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal size={16} strokeWidth={1.5} />
              <span>filters</span>
            </button>
          </div>

          <div className="catalog-layout">
            <aside className={`catalog-filters${filtersOpen ? ' is-open' : ''}`} aria-label="Pattern filters">
              <div className="filter-block">
                <label className="filter-label" htmlFor="pattern-search">Search</label>
                <div className="search-field">
                  <Search size={15} strokeWidth={1.4} />
                  <input
                    id="pattern-search"
                    value={query}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                    placeholder="name, tag, collection"
                  />
                </div>
              </div>

              <div className="filter-block">
                <div className="filter-label">Category</div>
                <div className="category-list">
                  <button
                    type="button"
                    className={category === 'all' ? 'active' : ''}
                    onClick={() => setCategory('all')}
                  >
                    All
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={category === item ? 'active' : ''}
                      onClick={() => setCategory(item)}
                    >
                      {categoryLabels[item]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-block" id="licenses">
                <div className="filter-label">License</div>
                <div className="license-segments">
                  {patterns[0]?.licenses.map((license) => (
                    <button
                      key={license.id}
                      type="button"
                      className={activeLicense === license.id ? 'active' : ''}
                      onClick={() => setActiveLicense(license.id)}
                      title={license.summary}
                    >
                      {license.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-block">
                <label className="filter-label" htmlFor="pattern-sort">Sort</label>
                <select
                  id="pattern-sort"
                  value={sort}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortMode)}
                >
                  <option value="featured">Featured first</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price ascending</option>
                  <option value="price-desc">Price descending</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </aside>

            <div className="catalog-results">
              <div className="results-meta">
                <span>{filteredPatterns.length} patterns</span>
                <span>{category === 'all' ? 'all categories' : categoryLabels[category]}</span>
              </div>

              <div className="patterns-grid">
                {filteredPatterns.map((pattern) => {
                  const license = getLicense(pattern, activeLicense);
                  return (
                    <article key={pattern.id} className="pattern-card">
                      <button
                        type="button"
                        className="pattern-preview-button"
                        onClick={() => setActivePattern(pattern)}
                        aria-label={`Preview ${pattern.name}`}
                      >
                        <PatternPreview preview={pattern.preview} label={pattern.name} />
                      </button>
                      <div className="pattern-card-body">
                        <div className="pattern-kicker">
                          <span>{pattern.edition}</span>
                          <span>{categoryLabels[pattern.category]}</span>
                        </div>
                        <h2>{pattern.name}</h2>
                        <p>{pattern.description}</p>
                        <div className="pattern-specs">
                          <span>{pattern.repeatSize}</span>
                          <span>{pattern.fileSize}</span>
                          <span>{pattern.formats.join(' / ')}</span>
                        </div>
                        <div className="pattern-actions">
                          <button type="button" className="btn-quiet" onClick={() => setActivePattern(pattern)}>
                            preview
                          </button>
                          <a className="btn-quiet details-link" href={`/patterns/${pattern.slug}`}>
                            <span>details</span>
                            <ArrowUpRight size={14} strokeWidth={1.5} />
                          </a>
                          <button type="button" className="btn-ink" onClick={() => addToCart(pattern)}>
                            <ShoppingBag size={15} strokeWidth={1.5} />
                            <span>{money.format(license.price)}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {activePattern ? (
        <div className="pattern-modal" role="dialog" aria-modal="true" aria-label={activePattern.name}>
          <div className="pattern-modal-panel">
            <button
              type="button"
              className="modal-close"
              aria-label="Close preview"
              onClick={() => setActivePattern(null)}
            >
              <X size={18} strokeWidth={1.5} />
            </button>
            <div className="modal-preview">
              <PatternPreview preview={activePattern.preview} label={activePattern.name} />
            </div>
            <div className="modal-copy">
              <span className="label">{activePattern.collection}</span>
              <h2>{activePattern.name}</h2>
              <p>{activePattern.description}</p>
              <dl>
                <div>
                  <dt>Repeat</dt>
                  <dd>{activePattern.repeatSize}</dd>
                </div>
                <div>
                  <dt>Formats</dt>
                  <dd>{activePattern.formats.join(', ')}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatUpdated(activePattern.updatedAt)}</dd>
                </div>
              </dl>
              <button type="button" className="btn-ink modal-buy" onClick={() => addToCart(activePattern)}>
                <ShoppingBag size={15} strokeWidth={1.5} />
                <span>Add selected license</span>
              </button>
              <a className="btn-quiet modal-detail-link" href={`/patterns/${activePattern.slug}`}>
                <span>Open detail page</span>
                <ArrowUpRight size={14} strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <aside className={`cart-drawer${cartOpen ? ' is-open' : ''}`} aria-label="Download basket" id="orders">
        <div className="cart-head">
          <div>
            <span className="label">download basket</span>
            <h2>Selected patterns</h2>
          </div>
          <button type="button" className="modal-close" aria-label="Close basket" onClick={() => setCartOpen(false)}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="cart-lines">
          {cart.length === 0 ? (
            <p className="cart-empty">No patterns selected.</p>
          ) : (
            cart.map((line) => {
              const license = getLicense(line.pattern, line.licenseId);
              return (
                <div key={line.id} className="cart-line">
                  <PatternPreview preview={line.pattern.preview} label={line.pattern.name} />
                  <div>
                    <h3>{line.pattern.name}</h3>
                    <p>{license.label} / {money.format(license.price)}</p>
                    <div className="quantity-row">
                      <button type="button" aria-label="Decrease quantity" onClick={() => updateQuantity(line.id, -1)}>
                        <Minus size={13} strokeWidth={1.5} />
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => updateQuantity(line.id, 1)}>
                        <Plus size={13} strokeWidth={1.5} />
                      </button>
                      <button type="button" className="remove-line" onClick={() => removeLine(line.id)}>
                        remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="cart-foot">
          <div className="subtotal">
            <span>Subtotal</span>
            <strong>{money.format(subtotal)}</strong>
          </div>
          <label className="filter-label" htmlFor="order-email">Email</label>
          <input
            id="order-email"
            className="email-input"
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
            placeholder="studio@example.com"
            type="email"
          />
          <button
            type="button"
            className="checkout-btn"
            disabled={cart.length === 0 || orderBusy}
            onClick={() => void createOrder()}
          >
            <Download size={16} strokeWidth={1.5} />
            <span>{orderBusy ? 'creating order' : 'create download order'}</span>
          </button>
          {orderStatus ? <p className="order-status">{orderStatus}</p> : null}
          {downloadLinks.length > 0 ? (
            <div className="download-link-list">
              {downloadLinks.map((download) => (
                <a key={`${download.patternId}-${download.format}`} href={download.href}>
                  <Download size={15} strokeWidth={1.5} />
                  <span>{download.name} {download.format}</span>
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      {cartOpen ? <button type="button" className="cart-scrim" aria-label="Close basket" onClick={() => setCartOpen(false)} /> : null}
    </>
  );
}
