'use client';

import type { JSX } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { PRODUCTS } from '@/data/products';

export default function WishlistPage(): JSX.Element {
  const { items, remove, total } = useWishlist();
  const { addItem, openCart } = useCart();
  const { toast } = useToast();

  const handleMoveToCart = (productId: string) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
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
    remove(productId);
    toast({ type: 'success', title: 'Moved to bag', message: product.name });
    openCart();
  };

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>
        {/* Header */}
        <div
          className="px-8 md:px-16 py-16 md:py-24 relative overflow-hidden"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Decorative background text */}
          <div
            className="absolute inset-0 flex items-center justify-end pr-16 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(6rem, 18vw, 18rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px var(--border)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {total}
            </span>
          </div>

          <div className="relative z-10">
            <div className="type-label mb-4" style={{ color: 'var(--accent)' }}>
              Saved objects
            </div>
            <h1 className="type-display-lg" style={{ color: 'var(--fg)' }}>
              Your Wishlist
            </h1>
            {total > 0 && (
              <p className="type-label mt-2" style={{ color: 'var(--muted)' }}>
                {total} {total === 1 ? 'piece' : 'pieces'} saved
              </p>
            )}
          </div>
        </div>

        {total === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32 px-8 text-center gap-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--border)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" style={{ color: 'var(--border)' }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.75rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  marginBottom: '0.5rem',
                }}
              >
                Nothing saved yet
              </p>
              <p className="type-label" style={{ color: 'var(--muted)' }}>
                Use the heart icon on any product to save it here
              </p>
            </div>
            <a href="/" className="btn-primary mt-2">Explore the collection</a>
          </div>
        ) : (
          <div className="px-8 md:px-16 py-12 max-w-screen-2xl mx-auto">
            {/* Move all to bag */}
            <div className="flex justify-end mb-8">
              <button
                className="btn-ghost"
                onClick={() => {
                  items.forEach((item) => handleMoveToCart(item.productId));
                }}
              >
                Move all to bag
              </button>
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {items.map((item) => (
                <div key={item.productId} className="group">
                  {/* Image */}
                  <a href={`/products/${item.slug}`} className="block relative overflow-hidden mb-4" style={{ aspectRatio: '3/4' }}>
                    <div
                      className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                      style={{ background: item.gradient }}
                    />
                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        remove(item.productId);
                        toast({ type: 'info', title: 'Removed from wishlist', message: item.name });
                      }}
                      aria-label={`Remove ${item.name} from wishlist`}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--muted)' }}>
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {/* Move to bag on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <button
                        className="btn-primary w-full justify-center text-center"
                        style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--fg)' }}
                        onClick={(e) => { e.preventDefault(); handleMoveToCart(item.productId); }}
                      >
                        Move to bag
                      </button>
                    </div>
                  </a>

                  {/* Info */}
                  <div className="type-label mb-1" style={{ color: 'var(--muted)' }}>{item.category}</div>
                  <a
                    href={`/products/${item.slug}`}
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, color: 'var(--fg)', display: 'block', marginBottom: '0.25rem' }}
                  >
                    {item.name}
                  </a>
                  <div className="type-price" style={{ color: 'var(--muted)' }}>{item.priceDisplay}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
