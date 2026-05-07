'use client';

import { useEffect, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useSiteContent } from '@/context/SiteContentContext';
import { ProductImage } from '@/components/ProductImage';

function QtyControl({
  productId,
  size,
  quantity,
  decreaseLabel,
  increaseLabel,
}: {
  productId: string;
  size: string;
  quantity: number;
  decreaseLabel: string;
  increaseLabel: string;
}): JSX.Element {
  const { setQty } = useCart();
  return (
    <div
      className="flex items-center gap-0"
      style={{ border: '1px solid var(--border)' }}
    >
      <button
        aria-label={decreaseLabel}
        onClick={() => setQty(productId, size, quantity - 1)}
        className="w-8 h-8 flex items-center justify-center type-label transition-colors hover:bg-[var(--surface)]"
        style={{ color: 'var(--muted)' }}
      >
        −
      </button>
      <span
        className="w-8 h-8 flex items-center justify-center type-price text-sm"
        style={{ color: 'var(--fg)' }}
      >
        {quantity}
      </span>
      <button
        aria-label={increaseLabel}
        onClick={() => setQty(productId, size, quantity + 1)}
        className="w-8 h-8 flex items-center justify-center type-label transition-colors hover:bg-[var(--surface)]"
        style={{ color: 'var(--muted)' }}
      >
        +
      </button>
    </div>
  );
}

export function CartDrawer(): JSX.Element {
  const { items, isOpen, totalItems, totalPrice, closeCart, removeItem } = useCart();
  const { cart } = useSiteContent();

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-400"
        style={{
          background: 'rgba(0,0,0,0.4)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          backdropFilter: isOpen ? 'blur(2px)' : 'none',
        }}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-label={cart.ariaLabel}
        aria-modal="true"
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(440px, 100vw)',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 300,
                color: 'var(--fg)',
              }}
            >
              {cart.title}
            </h2>
            <p className="type-label mt-0.5" style={{ color: 'var(--muted)' }}>
              {totalItems} {totalItems === 1 ? cart.itemSingular : cart.itemPlural}
            </p>
          </div>
          <button
            onClick={closeCart}
            aria-label={cart.closeLabel}
            className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-[var(--surface)]"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={{ color: 'var(--border)' }}>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                }}
              >
                {cart.emptyMessage}
              </p>
              <button className="btn-ghost mt-2" onClick={closeCart}>
                {cart.continueShoppingLabel}
              </button>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {items.map((item) => (
                <li
                  key={`${item.productId}::${item.size}`}
                  className="flex gap-5 px-8 py-6"
                >
                  {/* Thumbnail */}
                  <div
                    className="flex-shrink-0 w-20 h-24 relative overflow-hidden"
                  >
                    <ProductImage
                      imageUrl={item.imageUrl}
                      gradient={item.gradient}
                      alt={item.name}
                      className="absolute inset-0"
                      sizes="80px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: '1.05rem',
                              fontWeight: 300,
                              color: 'var(--fg)',
                              lineHeight: 1.2,
                            }}
                          >
                            {item.name}
                          </p>
                          <p className="type-label mt-1" style={{ color: 'var(--muted)' }}>
                            {item.category}
                            {item.size ? ` / ${item.size}` : ''}
                          </p>
                        </div>
                        <button
                          aria-label={`${cart.removeItemAriaPrefix} ${item.name}`}
                          onClick={() => removeItem(item.productId, item.size)}
                          className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <QtyControl
                        productId={item.productId}
                        size={item.size}
                        quantity={item.quantity}
                        decreaseLabel={cart.decreaseQuantityLabel}
                        increaseLabel={cart.increaseQuantityLabel}
                      />
                      <span className="type-price" style={{ color: 'var(--fg)' }}>
                        € {(item.price * item.quantity).toLocaleString('de-DE')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-8 py-6"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {/* Subtotal */}
            <div className="flex justify-between items-center mb-2">
              <span className="type-label" style={{ color: 'var(--muted)' }}>{cart.subtotalLabel}</span>
              <span className="type-price" style={{ color: 'var(--fg)' }}>
                € {totalPrice.toLocaleString('de-DE')}
              </span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="type-label" style={{ color: 'var(--muted)' }}>{cart.shippingLabel}</span>
              <span className="type-label" style={{ color: 'var(--muted)' }}>{cart.shippingNote}</span>
            </div>

            <div className="divider mb-5" />

            <div className="flex justify-between items-center mb-6">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 400,
                  color: 'var(--fg)',
                }}
              >
                {cart.totalLabel}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.1rem',
                  color: 'var(--fg)',
                }}
              >
                € {totalPrice.toLocaleString('de-DE')}
              </span>
            </div>

            <a href="/checkout" onClick={closeCart} className="btn-primary w-full justify-center text-center">
              {cart.checkoutLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            <p className="type-label text-center mt-4" style={{ color: 'var(--muted)' }}>
              {cart.footerNote}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
