/* eslint-disable @typescript-eslint/explicit-function-return-type, @typescript-eslint/strict-boolean-expressions, complexity, max-lines, max-lines-per-function */
'use client';

import { useState, useEffect, type JSX } from 'react';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { useWishlist } from '@/context/WishlistContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/locales';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductImage } from '@/components/ProductImage';
import type { Product } from '@/data/products';
import type { ProductsContent, ProductsDetailContent } from '@/data/productsContent';

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
        className='w-full flex items-center justify-between py-5'
        aria-expanded={open}
      >
        <span className='type-label' style={{ color: 'var(--fg)' }}>
          {label}
        </span>
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          strokeLinecap='round'
          style={{
            color: 'var(--muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        >
          <path d='M6 9l6 6 6-6' />
        </svg>
      </button>
      {open && (
        <div className='pb-5'>
          <ul className='space-y-2'>
            {(children as string[]).map((item) => (
              <li
                key={item}
                className='flex items-start gap-3'
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  fontWeight: 400,
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
      className='fixed inset-0 z-50 flex items-end md:items-center justify-center'
      onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className='w-full md:max-w-lg mx-4 md:mx-0'
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          padding: '2.5rem',
        }}
      >
        <div className='flex items-center justify-between mb-6'>
          <div>
            <div className='type-label mb-1' style={{ color: 'var(--accent)' }}>{content.sizeGuideEyebrow}</div>
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
            className='text-[var(--muted)] hover:text-[var(--fg)] transition-colors'
          >
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
              <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
            </svg>
          </button>
        </div>

        <p className='type-label mb-6' style={{ color: 'var(--muted)' }}>
          {content.sizeGuideBody}
        </p>

        <table className='w-full'>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {content.sizeGuideHeaders.map((h) => (
                <th
                  key={h}
                  className='type-label pb-3 text-left'
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
                  className='py-3.5'
                  style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, color: 'var(--fg)' }}
                >
                  {row.size}
                </td>
                {[row.chest, row.waist, row.hips].map((v, i) => (
                  <td
                    key={i}
                    className='py-3.5'
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--muted)' }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className='type-label mt-6' style={{ color: 'var(--muted)' }}>
          {content.sizeGuideHelpPrefix} <a href={`mailto:${content.sizeGuideHelpEmail}`} className='underline underline-offset-2 hover:text-[var(--fg)] transition-colors'>{content.sizeGuideHelpEmail}</a>
        </p>
      </div>
    </div>
  );
}

function uniqueGalleryImages(product: Product): string[] {
  const seen = new Set<string>();
  const images: string[] = [];
  const candidates = [
    ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
    product.imageUrl,
  ];

  for (const candidate of candidates) {
    const imageUrl = typeof candidate === 'string' ? candidate.trim() : '';
    if (!imageUrl || seen.has(imageUrl)) continue;
    seen.add(imageUrl);
    images.push(imageUrl);
  }

  return images;
}

function ProductDetailGalleryImage({
  alt,
  gradient,
  imageUrl,
  priority = false,
  sizes,
}: {
  alt: string;
  gradient: string;
  imageUrl: string;
  priority?: boolean;
  sizes: string;
}): JSX.Element {
  return (
    <ProductImage
      imageUrl={imageUrl}
      gradient={gradient}
      alt={alt}
      sizes={sizes}
      className='absolute inset-0'
      fit='cover'
      position='center'
      priority={priority}
      quality={82}
    />
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
  const localizedHref = useLocalizedHref();
  const locale = useLocale();
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const { isWishlisted, toggle: toggleWishlist, getCount, requestCount } = useWishlist();
  const { user } = useAuth();
  const { track } = useRecentlyViewed();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[1] ?? '');
  const [activeImage, setActiveImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const galleryImages = uniqueGalleryImages(product);
  const wishlistCount = getCount(product.id);

  useEffect(() => { requestCount(product.id); }, [product.id, requestCount]);

  useEffect(() => {
    track({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      currencyCode: product.currencyCode,
      gradient: product.gradient,
      imageUrl: product.imageUrl,
    });
  }, [product.id]);

  useEffect(() => {
    setActiveImage(0);
  }, [product.id]);

  const gradients = [
    product.gradient,
    product.gradientAlt ?? product.gradient,
    `linear-gradient(200deg, ${product.gradient.match(/#[A-Fa-f0-9]{6}/g)?.[0] ?? '#ccc'} 0%, ${product.gradient.match(/#[A-Fa-f0-9]{6}/g)?.[1] ?? '#aaa'} 100%)`,
  ];
  const activeGradient = gradients[activeImage % gradients.length] ?? product.gradient;

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
      name: product.shortName ?? product.name,
      category: product.category,
      price: product.price,
      priceDisplay: product.priceDisplay,
      currencyCode: product.currencyCode,
      size: selectedSize,
      gradient: product.gradient,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    toast({
      type: 'success',
      title: detailContent.addedToastTitle,
      message: `${product.shortName ?? product.name}${selectedSize ? ` — ${selectedSize}` : ''}`,
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
          className='px-8 md:px-16 py-5 flex items-center gap-2'
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <a href={localizedHref('/')} className='type-label hover:text-[var(--fg)] transition-colors' style={{ color: 'var(--muted)' }}>{detailContent.homeBreadcrumbLabel}</a>
          <span className='type-label' style={{ color: 'rgba(var(--accent-rgb),0.35)' }}>/</span>
          <a href={localizedHref(`/collections/${product.collectionSlug}`)} className='type-label hover:text-[var(--fg)] transition-colors' style={{ color: 'var(--muted)' }}>
            {product.category}
          </a>
          <span className='type-label' style={{ color: 'rgba(var(--accent-rgb),0.35)' }}>/</span>
          <span className='type-label' style={{ color: 'var(--fg)' }}>{product.shortName ?? product.name}</span>
        </div>

        {/* Main layout */}
        <div className='grid md:grid-cols-2 lg:grid-cols-[55%_45%] min-h-[80vh]'>
          {/* ── Image column ─────────────────────────────────────────── */}
          <div className='flex flex-col'>
            {/* Main image */}
            <div
              className='relative grain flex-1 overflow-hidden'
              style={{
                background: activeGradient,
                minHeight: '60vh',
                transition: 'background 0.6s ease',
              }}
            >
              {galleryImages[activeImage] && (
                <ProductDetailGalleryImage
                  imageUrl={galleryImages[activeImage]}
                  alt={`${product.name} image ${activeImage + 1}`}
                  gradient={activeGradient}
                  priority
                  sizes='(max-width: 768px) 100vw, 55vw'
                />
              )}
              {/* Image is intentionally clean — badges live in the info column */}
            </div>

            {/* Thumbnail row */}
            <div
              className='flex gap-2 p-4'
              style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
            >
              {(galleryImages.length > 0 ? galleryImages : gradients).map((imageUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`${detailContent.imageAriaPrefix} ${i + 1}`}
                  className='flex-1 transition-all duration-200 relative overflow-hidden'
                  style={{
                    aspectRatio: '1/1',
                    background: gradients[i % gradients.length],
                    outline: activeImage === i ? '2px solid var(--fg)' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                >
                  {galleryImages.length > 0 && (
                    <ProductDetailGalleryImage
                      imageUrl={imageUrl}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      gradient={gradients[i % gradients.length]}
                      sizes='80px'
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Info column ──────────────────────────────────────────── */}
          <div
            className='px-8 md:px-12 py-10 flex flex-col justify-between'
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            <div>
              {/* Category + badges */}
              <div className='flex flex-wrap items-center gap-2 mb-4'>
                <span className='type-label' style={{ color: 'var(--accent)' }}>
                  {product.category}
                </span>
                {product.lore && (
                  <span
                    className='type-label px-2 py-1'
                    style={{
                      color: 'rgba(180,160,255,0.9)',
                      border: '1px solid rgba(140,100,255,0.35)',
                    }}
                  >
                    {product.lore}
                  </span>
                )}
                {product.tag && (
                  <span className='type-label px-2 py-1' style={{ background: 'var(--accent)', color: '#fff' }}>
                    {product.tag}
                  </span>
                )}
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
                {product.shortName ?? product.name}
              </h1>

              {/* Price */}
              <div
                className='type-price text-2xl mb-8'
                style={{ color: 'var(--fg)' }}
              >
                {formatPrice(product.price, locale, product.currencyCode)}
              </div>

              {/* Parsed name specs: size + material */}
              {(product.sizeInfo || product.material) && (
                <div
                  className='flex flex-wrap gap-x-6 gap-y-1 mb-6'
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.06em' }}
                >
                  {product.sizeInfo && (
                    <span style={{ color: 'var(--muted)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: '0.58rem', letterSpacing: '0.12em' }}>
                        Size&ensp;
                      </span>
                      {product.sizeInfo}
                    </span>
                  )}
                  {product.material && (
                    <span style={{ color: 'var(--muted)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontSize: '0.58rem', letterSpacing: '0.12em' }}>
                        Material&ensp;
                      </span>
                      {product.material}
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  fontWeight: 400,
                  color: 'var(--muted)',
                  lineHeight: 1.85,
                  marginBottom: '2rem',
                }}
              >
                {product.description}
              </p>

              {/* Size selector */}
              {product.sizes.length > 0 && (
                <div className='mb-8'>
                  <div className='flex items-center justify-between mb-3'>
                    <span className='type-label' style={{ color: sizeError ? 'var(--accent)' : 'var(--fg)' }}>
                      {sizeError ? detailContent.sizeRequiredLabel : detailContent.selectSizeLabel}
                    </span>
                    <button
                      className='type-label underline underline-offset-2 hover:text-[var(--fg)] transition-colors'
                      style={{ color: 'var(--muted)' }}
                      onClick={() => setSizeGuideOpen(true)}
                    >
                      {detailContent.sizeGuideLabel}
                    </button>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {product.sizes.map((size) => {
                      let borderColor = 'var(--border)';
                      if (sizeError) {
                        borderColor = 'var(--accent)';
                      } else if (selectedSize === size) {
                        borderColor = 'var(--fg)';
                      }

                      return (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setSizeError(false);
                          }}
                          className='type-label px-4 py-2.5 transition-all duration-200'
                          style={{
                            background: selectedSize === size ? 'var(--fg)' : 'transparent',
                            color: selectedSize === size ? 'var(--bg)' : 'var(--fg)',
                            border: `1px solid ${borderColor}`,
                            minWidth: '3rem',
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add to bag */}
              <button
                onClick={handleAddToBag}
                disabled={adding}
                className='btn-primary w-full justify-center mb-3'
                style={{
                  background: adding ? 'var(--accent)' : 'var(--fg)',
                  color: 'var(--bg)',
                  transition: 'background 0.3s ease, transform 0.2s ease',
                }}
              >
                {adding ? (
                  <>
                    {detailContent.addedButtonLabel}
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
                      <path d='M20 6L9 17l-5-5' />
                    </svg>
                  </>
                ) : (
                  <>
                    {detailContent.addToBagLabel}
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                      <path d='M5 12h14M12 5l7 7-7 7' />
                    </svg>
                  </>
                )}
              </button>

              <div className='mb-8'>
                {user && (
                  <button
                    className='btn-ghost w-full justify-center mb-2'
                    onClick={() => {
                      toggleWishlist({
                        productId: product.id,
                        slug: product.slug,
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        priceDisplay: product.priceDisplay,
                        currencyCode: product.currencyCode,
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
                    <StarIcon filled={isWishlisted(product.id)} size={14} />
                    {isWishlisted(product.id) ? detailContent.savedWishlistButtonLabel : detailContent.saveWishlistButtonLabel}
                  </button>
                )}
                {wishlistCount > 0 && (
                  <div
                    className='flex items-center justify-center gap-1.5'
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.06em', color: 'var(--muted)' }}
                  >
                    <StarIcon filled={false} size={9} />
                    {wishlistCount}
                  </div>
                )}
              </div>
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

        <ProductReviews slug={product.slug} content={detailContent} writeReviewHref={localizedHref(detailContent.writeReviewHref)} />

        {/* Related products */}
        {related.length > 0 && (
          <section className='px-8 md:px-16 py-20' style={{ borderTop: '1px solid var(--border)' }}>
            <div className='mb-10'>
              <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>
                {detailContent.relatedEyebrow}
              </div>
              <h2 className='type-display-md' style={{ color: 'var(--fg)' }}>
                {detailContent.relatedTitle}
              </h2>
            </div>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {related.map((p) => (
                <a
                  key={p.id}
                  href={localizedHref(`/products/${p.slug}`)}
                  className='group block'
                >
                  <div
                    className='relative w-full overflow-hidden mb-3'
                    style={{ aspectRatio: '1/1' }}
                  >
                    <ProductImage
                      imageUrl={p.imageUrl}
                      gradient={p.gradient}
                      alt={p.shortName ?? p.name}
                      className='absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]'
                      sizes='(max-width: 768px) 50vw, 25vw'
                      fit='cover'
                      position='center'
                    />
                  </div>
                  <div className='type-label mb-1' style={{ color: 'var(--muted)' }}>{p.category}</div>
                  {p.lore && (
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
                        {p.lore}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 300,
                      color: 'var(--fg)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {p.shortName ?? p.name}
                  </div>
                  <div className='type-price' style={{ color: 'var(--muted)' }}>{formatPrice(p.price, locale, p.currencyCode)}</div>
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
