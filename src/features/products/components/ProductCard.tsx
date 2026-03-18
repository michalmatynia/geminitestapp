'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { Link } from '@/i18n/navigation';
import type { ProductWithImages } from '@/shared/contracts/products';
import { normalizeSiteLocale, resolveLocalizedText } from '@/shared/lib/i18n/site-locale';
import { MissingImagePlaceholder, ResourceCard } from '@/shared/ui';

interface ProductCardProps {
  product: ProductWithImages;
  className?: string;
}

export default function ProductCard(props: ProductCardProps): React.JSX.Element {
  const translations = useTranslations('FallbackHome.ProductCard');
  const locale = normalizeSiteLocale(useLocale());
  const { product, className } = props;
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0]?.imageFile?.filepath ?? null)
      : null;

  const localeSuffix = locale.split('-')[0] ?? locale;
  const localizedName =
    resolveLocalizedText(product.name, locale) ??
    ((product as Record<string, unknown>)[`name_${localeSuffix}`] as string | null | undefined) ??
    product.name_en ??
    product.name_pl ??
    product.name_de ??
    translations('fallbackTitle');
  const name =
    localizedName && localizedName.trim().length > 0
      ? localizedName
      : translations('fallbackTitle');
  const linkHref = `/products/${product.id}`;
  const cardClassName = className ? `h-full ${className}` : 'h-full';
  const ariaLabel = name
    ? translations('viewProduct', { name })
    : translations('viewProductFallback');
  const price =
    typeof product.price === 'number'
      ? new Intl.NumberFormat(
          locale === 'pl' ? 'pl-PL' : locale === 'de' ? 'de-DE' : 'en-US',
          {
            style: 'currency',
            currency: 'USD',
          }
        ).format(product.price)
      : '—';

  return (
    <Link
      href={linkHref}
      className='group block h-full transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <ResourceCard
        title={name}
        className={cardClassName}
        media={
          <div className='relative h-48 w-full'>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                fill
                className='rounded-md object-cover transition-transform duration-300 ease-out group-hover:scale-105'
                sizes='(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'
              />
            ) : (
              <MissingImagePlaceholder className='h-full w-full rounded-md' />
            )}
          </div>
        }
        footer={<p className='text-lg font-semibold'>{price}</p>}
      />
    </Link>
  );
}
