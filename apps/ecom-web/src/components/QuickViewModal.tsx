'use client';

import { useState, useEffect, type JSX } from 'react';
import { useQuickView } from '@/context/QuickViewContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/context/ToastContext';
import { useSiteContent } from '@/context/SiteContentContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { formatPrice } from '@/lib/locales';
import { ProductImage } from '@/components/ProductImage';

export function QuickViewModal(): JSX.Element | null {
  const { product, close } = useQuickView();
  const { addItem, openCart } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { toast } = useToast();
  const { quickView } = useSiteContent();
  const localizedHref = useLocalizedHref();
  const locale = useLocale();
  const [selectedSize, setSelectedSize] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedSize(product.sizes[1] ?? '');
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [product]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  if (!product) return null;

  const handleAdd = () => {
    setAdding(true);
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      size: selectedSize,
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    toast({
      type: 'success',
      title: quickView.addedToastTitle,
      message: `${product.shortName ?? product.name}${selectedSize ? ` — ${selectedSize}` : ''}`,
    });
    setTimeout(() => {
      setAdding(false);
      openCart();
      close();
    }, 500);
  };

  const wishlisted = isWishlisted(product.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={close}
      style={{ background: 'var(--modal-scrim)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full md:max-w-3xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          maxHeight: '92vh',
        }}
      >
        {/* Image panel — hidden on mobile */}
        <div
          className="hidden md:block relative flex-shrink-0 grain"
          style={{ width: '45%', minHeight: '480px' }}
        >
          <ProductImage
            imageUrl={product.imageUrl}
            gradient={product.gradient}
            alt={product.shortName ?? product.name}
            className="absolute inset-0"
            sizes="40vw"
          />
          {product.tag && (
            <div className="absolute top-6 left-6 z-10">
              <span className="type-label px-3 py-1.5" style={{ background: 'var(--accent)', color: '#fff' }}>
                {product.tag}
              </span>
            </div>
          )}
          <div
            className="absolute bottom-6 left-6 z-10"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}
          >
            {quickView.brandLabel} / {product.id}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-y-auto px-8 py-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="type-label mb-2" style={{ color: 'var(--accent)' }}>{product.category}</div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                  fontWeight: 300,
                  color: 'var(--fg)',
                  lineHeight: 1.05,
                  marginBottom: '0.5rem',
                }}
              >
                {product.shortName ?? product.name}
              </h2>
              <div className="type-price text-xl" style={{ color: 'var(--fg)' }}>
                {formatPrice(product.price, locale)}
              </div>
            </div>
            <button
              onClick={close}
              aria-label={quickView.closeLabel}
              className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors flex-shrink-0 ml-4 mt-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: 'var(--muted)',
              lineHeight: 1.85,
              marginBottom: '1.75rem',
            }}
          >
            {product.description}
          </p>

          {/* Sizes */}
          {product.sizes.length > 0 && (
            <div className="mb-6">
              <div className="type-label mb-3" style={{ color: 'var(--fg)' }}>{quickView.selectSizeLabel}</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className="type-label px-4 py-2.5 transition-all duration-200"
                    style={{
                      background: selectedSize === size ? 'var(--fg)' : 'transparent',
                      color: selectedSize === size ? 'var(--bg)' : 'var(--fg)',
                      border: `1px solid ${selectedSize === size ? 'var(--fg)' : 'var(--border)'}`,
                      minWidth: '3rem',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-auto">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="btn-primary w-full justify-center"
              style={{ background: adding ? 'var(--accent)' : 'var(--fg)', transition: 'background 0.3s ease' }}
            >
              {adding ? (
                <>
                  {quickView.addedButtonLabel}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </>
              ) : (
                <>
                  {quickView.addToBagLabel}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            <div className="flex gap-3">
              <button
                className="btn-ghost flex-1 justify-center"
                onClick={() => {
                  toggleWishlist({
                    productId: product.id,
                    slug: product.slug,
                    name: product.shortName ?? product.name,
                    category: product.category,
                    price: product.price,
                    priceDisplay: product.priceDisplay,
                    gradient: product.gradient,
                    imageUrl: product.imageUrl,
                  });
                  toast({
                    type: wishlisted ? 'info' : 'success',
                    title: wishlisted ? quickView.removedWishlistToastTitle : quickView.savedWishlistToastTitle,
                    message: product.shortName ?? product.name,
                  });
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill={wishlisted ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ color: wishlisted ? 'var(--accent)' : 'inherit' }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlisted ? quickView.savedWishlistButtonLabel : quickView.saveWishlistButtonLabel}
              </button>
              <a
                href={localizedHref(`/products/${product.slug}`)}
                className="btn-ghost flex-1 justify-center"
                onClick={close}
              >
                {quickView.fullDetailsLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
