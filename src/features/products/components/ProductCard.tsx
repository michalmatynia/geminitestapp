import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import type { ProductWithImages } from '@/shared/contracts/products';
import { MissingImagePlaceholder, ResourceCard } from '@/shared/ui';

interface ProductCardProps {
  product: ProductWithImages;
  className?: string;
}

export default function ProductCard(props: ProductCardProps): React.JSX.Element {
  const { product, className } = props;
  const imageUrl =
    Array.isArray(product.images) && product.images.length > 0
      ? (product.images[0]?.imageFile?.filepath ?? null)
      : null;

  // ✅ Localized name fallback: en -> pl -> de -> generic
  const name = product.name_en ?? product.name_pl ?? product.name_de ?? 'Product';
  const linkHref = `/products/${product.id}`;
  const cardClassName = className ? `h-full ${className}` : 'h-full';
  const ariaLabel = name ? `View ${name}` : 'View product';
  const price =
    typeof product.price === 'number'
      ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(product.price)
      : '—';

  return (
    <Link
      href={linkHref}
      className='group block h-full transition-transform duration-300 ease-out hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2'
      aria-label={ariaLabel}
      title={ariaLabel}>
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
