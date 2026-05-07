'use client';

import { useState, useEffect, type JSX, type SyntheticEvent } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductReviews } from '@/components/ProductReviews';
import type { Product } from '@/data/products';
import type { ProductsContent, ProductsDetailContent } from '@/data/productsContent';
import {
  getProductImageFallbackSrc,
  getProductImageSrc,
  shouldBypassImageOptimization,
} from '@/lib/productImages';

const SWATCHES = [0, 1, 2] as const;

function AccordionItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5"
        aria-expanded={open}
      >
        <span className="type-label" style={{ color: 'var(--fg)' }}>
          {label}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            color: 'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="pb-5">
          <ul className="space-y-2">
            {(children as string[]).map((item) => (
              <li
                key={item}
                className="flex items-start gap-3"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  lineHeight: 1.65,
                }}
              >
                <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem' }}>—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SizeGuideModal({
  onClose,
  content,
}: {
  onClose: () => void;
  content: ProductsDetailContent;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full md:max-w-lg mx-4 md:mx-0"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          padding: '2.5rem',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="type-label mb-1" style={{ color: 'var(--accent)' }}>{content.sizeGuideEyebrow}</div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--fg)',
              }}
            >
              {content.sizeGuideTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={content.closeSizeGuideLabel}
            className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="type-label mb-6" style={{ color: 'var(--muted)' }}>
          {content.sizeGuideBody}
        </p>

        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {content.sizeGuideHeaders.map((h) => (
                <th
                  key={h}
                  className="type-label pb-3 text-left"
                  style={{ color: 'var(--muted)', fontWeight: 400 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.sizeGuideRows.map((row) => (
              <tr
                key={row.size}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td
                  className="py-3.5"
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, color: 'var(--fg)' }}
                >
                  {row.size}
                </td>
                {[row.chest, row.waist, row.hips].map((v, i) => (
                  <td
                    key={i}
                    className="py-3.5"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--muted)' }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="type-label mt-6" style={{ color: 'var(--muted)' }}>
          {content.sizeGuideHelpPrefix} <a href={`mailto:${content.sizeGuideHelpEmail}`} className="underline underline-offset-2 hover:text-[var(--fg)] transition-colors">{content.sizeGuideHelpEmail}</a>
        </p>
      </div>
    </div>
  );
}

export function ProductDetailClient({
  product,
  related,
  content,
}: {
  product: Product;
  related: Product[];
  content: ProductsContent;
}): JSX.Element {
  const detailContent = content.detail;
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { track } = useRecentlyViewed();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[1] ?? '');
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const resolvedProductImageUrl = getProductImageSrc(product.imageUrl);
  const fallbackProductImageUrl = getProductImageFallbackSrc(product.imageUrl);
  const usesNativeProductImage = shouldBypassImageOptimization(resolvedProductImageUrl);
  const handleNativeProductImageError = (e: SyntheticEvent<HTMLImageElement>): void => {
    const image = e.currentTarget;
    if (fallbackProductImageUrl && image.getAttribute('src') !== fallbackProductImageUrl) {
      image.src = fallbackProductImageUrl;
      return;
    }
    image.style.display = 'none';
  };

  useEffect(() => {
    track({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      priceDisplay: product.priceDisplay,
      gradient: product.gradient,
      imageUrl: product.imageUrl,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const gradients = [
    product.gradient,
    product.gradientAlt ?? product.gradient,
    `linear-gradient(200deg, ${product.gradient.match(/#[A-Fa-f0-9]{6}/g)?.[0] ?? '#ccc'} 0%, ${product.gradient.match(/#[A-Fa-f0-9]{6}/g)?.[1] ?? '#aaa'} 100%)`,
  ];

  const handleAddToBag = () => {
    if (product.sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    setAdding(true);
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
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
      title: detailContent.addedToastTitle,
      message: `${product.name}${selectedSize ? ` — ${selectedSize}` : ''}`,
    });
    setTimeout(() => {
      setAdding(false);
      openCart();
    }, 600);
  };

  return (
    <>
      {sizeGuideOpen && <SizeGuideModal onClose={() => setSizeGuideOpen(false)} content={detailContent} />}
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        {/* Breadcrumb */}
        <div
          className="px-8 md:px-16 py-5 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <a href="/" className="type-label hover:text-[var(--fg)] transition-colors" style={{ color: 'var(--muted)' }}>{detailContent.homeBreadcrumbLabel}</a>
          <span className="type-label" style={{ color: 'var(--border)' }}>/</span>
          <a href={`/collections/${product.collectionSlug}`} className="type-label hover:text-[var(--fg)] transition-colors" style={{ color: 'var(--muted)' }}>
            {product.category}
          </a>
          <span className="type-label" style={{ color: 'var(--border)' }}>/</span>
          <span className="type-label" style={{ color: 'var(--fg)' }}>{product.name}</span>
        </div>

        {/* Main layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-[55%_45%] min-h-[80vh]">
          {/* ── Image column ─────────────────────────────────────────── */}
          <div className="flex flex-col">
            {/* Main image */}
            <div
              className="relative grain flex-1 overflow-hidden"
              style={{
                background: gradients[activeImage],
                minHeight: '60vh',
                transition: 'background 0.6s ease',
              }}
            >
              {resolvedProductImageUrl && activeImage === 0 && usesNativeProductImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedProductImageUrl}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center',
                  }}
                  onError={handleNativeProductImageError}
                />
              )}
              {resolvedProductImageUrl && activeImage === 0 && !usesNativeProductImage && (
                <Image
                  src={resolvedProductImageUrl}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 55vw"
                  style={{ objectFit: 'contain', objectPosition: 'center' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {product.tag && (
                <div className="absolute top-8 left-8 z-10">
                  <span className="type-label px-3 py-1.5" style={{ background: 'var(--accent)', color: '#fff' }}>
                    {product.tag}
                  </span>
                </div>
              )}
              {/* Decorative rotated label */}
              <div
                className="absolute right-8 bottom-12 rotate-[-90deg] origin-bottom-right z-10"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <span className="type-label tracking-[0.2em]">{detailContent.rotatedBrandLabel} / {product.id}</span>
              </div>
            </div>

            {/* Thumbnail row */}
            <div
              className="flex gap-2 p-4"
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
            >
              {SWATCHES.map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`${detailContent.imageAriaPrefix} ${i + 1}`}
                  className="flex-1 h-20 transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: gradients[i],
                    outline: activeImage === i ? `2px solid var(--fg)` : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                >
                  {resolvedProductImageUrl && i === 0 && usesNativeProductImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedProductImageUrl}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                      }}
                      onError={handleNativeProductImageError}
                    />
                  )}
                  {resolvedProductImageUrl && i === 0 && !usesNativeProductImage && (
                    <Image
                      src={resolvedProductImageUrl}
                      alt={product.name}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'contain', objectPosition: 'center' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Info column ──────────────────────────────────────────── */}
          <div
            className="px-8 md:px-12 py-10 flex flex-col justify-between"
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            <div>
              {/* Category */}
              <div className="type-label mb-4" style={{ color: 'var(--accent)' }}>
                {product.category}
              </div>

              {/* Name */}
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 300,
                  lineHeight: 1.05,
                  color: 'var(--fg)',
                  marginBottom: '1rem',
                }}
              >
                {product.name}
              </h1>

              {/* Price */}
              <div
                className="type-price text-2xl mb-8"
                style={{ color: 'var(--fg)' }}
              >
                {product.priceDisplay}
              </div>

              {/* Description */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 300,
                  color: 'var(--muted)',
                  lineHeight: 1.85,
                  marginBottom: '2rem',
                }}
              >
                {product.description}
              </p>

              {/* Size selector */}
              {product.sizes.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="type-label" style={{ color: sizeError ? 'var(--accent)' : 'var(--fg)' }}>
                      {sizeError ? detailContent.sizeRequiredLabel : detailContent.selectSizeLabel}
                    </span>
                    <button
                      className="type-label underline underline-offset-2 hover:text-[var(--fg)] transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onClick={() => setSizeGuideOpen(true)}
                    >
                      {detailContent.sizeGuideLabel}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => { setSelectedSize(size); setSizeError(false); }}
                        className="type-label px-4 py-2.5 transition-all duration-200"
                        style={{
                          background: selectedSize === size ? 'var(--fg)' : 'transparent',
                          color: selectedSize === size ? 'var(--bg)' : 'var(--fg)',
                          border: `1px solid ${sizeError ? 'var(--accent)' : selectedSize === size ? 'var(--fg)' : 'var(--border)'}`,
                          minWidth: '3rem',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to bag */}
              <button
                onClick={handleAddToBag}
                disabled={adding}
                className="btn-primary w-full justify-center mb-3"
                style={{
                  background: adding ? 'var(--accent)' : 'var(--fg)',
                  transition: 'background 0.3s ease, transform 0.2s ease',
                }}
              >
                {adding ? (
                  <>
                    {detailContent.addedButtonLabel}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </>
                ) : (
                  <>
                    {detailContent.addToBagLabel}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>

              <button
                className="btn-ghost w-full justify-center mb-8"
                onClick={() => {
                  toggleWishlist({
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    priceDisplay: product.priceDisplay,
                    gradient: product.gradient,
                    imageUrl: product.imageUrl,
                  });
                  toast({
                    type: isWishlisted(product.id) ? 'info' : 'success',
                    title: isWishlisted(product.id) ? detailContent.removedWishlistToastTitle : detailContent.savedWishlistToastTitle,
                    message: product.name,
                  });
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill={isWishlisted(product.id) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{ color: isWishlisted(product.id) ? 'var(--accent)' : 'inherit' }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {isWishlisted(product.id) ? detailContent.savedWishlistButtonLabel : detailContent.saveWishlistButtonLabel}
              </button>
            </div>

            {/* Accordions */}
            <div>
              <AccordionItem label={detailContent.detailsAccordionLabel}>{product.details}</AccordionItem>
              <AccordionItem label={detailContent.careAccordionLabel}>{product.care}</AccordionItem>
              <AccordionItem label={detailContent.shippingReturnsAccordionLabel}>
                {detailContent.shippingReturnsItems}
              </AccordionItem>
            </div>
          </div>
        </div>

        <ProductReviews slug={product.slug} content={detailContent} />

        {/* Related products */}
        {related.length > 0 && (
          <section className="px-8 md:px-16 py-20" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="mb-10">
              <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>
                {detailContent.relatedEyebrow}
              </div>
              <h2 className="type-display-md" style={{ color: 'var(--fg)' }}>
                {detailContent.relatedTitle}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => (
                <a
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="group block"
                >
                  <div
                    className="w-full mb-4 transition-transform duration-500 group-hover:scale-[1.02]"
                    style={{ background: p.gradient, aspectRatio: '3/4' }}
                  />
                  <div className="type-label mb-1" style={{ color: 'var(--muted)' }}>{p.category}</div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {p.name}
                  </div>
                  <div className="type-price" style={{ color: 'var(--muted)' }}>{p.priceDisplay}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
