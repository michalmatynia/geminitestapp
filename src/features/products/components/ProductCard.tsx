'use client';
// ProductCard: client-side presentational card used across frontend and admin.
// Uses next-intl for localization and ResourceCard for consistent layout.

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { Link } from '@/i18n/navigation';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { normalizeSiteLocale, resolveLocalizedText } from '@/shared/lib/i18n/site-locale';
import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';
import { ResourceCard } from '@/shared/ui/ResourceCard';
import { resolveProductImageFileUrl } from '@/shared/utils/image-routing';

interface ProductCardProps {
  product: ProductWithImages;
  className?: string;
}

function resolveProductImageUrl(product: ProductWithImages): string | null {
  const images = Array.isArray(product.images) ? product.images : [];
  const firstImage = images[0];
  if (firstImage === undefined) return null;
  return resolveProductImageFileUrl(firstImage.imageFile);
}

function ProductCardImage({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}): React.JSX.Element {
  if (imageUrl === null) {
    return <MissingImagePlaceholder className='h-full w-full rounded-md' />;
  }

  return (
    <Image
      src={imageUrl}
      alt={name}
      fill
      loading='lazy'
      unoptimized={imageUrl.startsWith('http')}
      className='rounded-md object-cover transition-transform duration-300 ease-out group-hover:scale-105'
      sizes='(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
    />
  );
}

function resolveProductDisplayName(product: ProductWithImages, locale: string, fallback: string): string {
  const localized = resolveLocalizedText(product.name, locale);
  if (typeof localized === 'string' && localized.trim() !== '') return localized;

  const suffix = locale.split('-')[0];
  const legacy = (product as Record<string, unknown>)[`name_${suffix}`];
  if (typeof legacy === 'string' && legacy.trim() !== '') return legacy;

  const names = [product.name_en, product.name_pl, product.name_de];
  const candidate = names.find((n): n is string => typeof n === 'string' && n.trim() !== '');
  return candidate ?? fallback;
}

function formatProductPrice(price: number | null, locale: string): string {
  if (typeof price !== 'number') return '—';
  let tag = 'en-US';
  if (locale === 'pl') {
    tag = 'pl-PL';
  } else if (locale === 'de') {
    tag = 'de-DE';
  }
  return new Intl.NumberFormat(tag, { style: 'currency', currency: 'USD' }).format(price);
}

export default function ProductCard(props: ProductCardProps): React.JSX.Element {
  const { product, className } = props;
  const translations = useTranslations('FallbackHome.ProductCard');
  const locale = normalizeSiteLocale(useLocale());
  
  const imageUrl = resolveProductImageUrl(product);
  const fallbackTitle = translations('fallbackTitle');
  const name = resolveProductDisplayName(product, locale, fallbackTitle);
  const price = formatProductPrice(product.price, locale);
  const ariaLabel = translations('viewProduct', { name });

  return (
    <Link
      href={`/products/${product.id}`}
      className='group block h-full transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <ResourceCard
        title={name}
        className={typeof className === 'string' && className !== '' ? `h-full ${className}` : 'h-full'}
        media={
          <div className='relative h-48 w-full'>
            <ProductCardImage imageUrl={imageUrl} name={name} />
          </div>
        }
        footer={<p className='text-lg font-semibold'>{price}</p>}
      />
    </Link>
  );
}
