'use client';

import Image from 'next/image';
import type { JSX } from 'react';

import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';

import { BLUR_PLACEHOLDER, hasImageUrl } from './ProductImageCell.helpers';
import type { ProductImageCellController } from './ProductImageCell.controller';

interface ProductImagePreviewTriggerProps {
  imageUrl: string | null;
  productName: string;
  showPreview: ProductImageCellController['showPreview'];
  unoptimized: boolean;
}

export function ProductImagePreviewTrigger({
  imageUrl,
  productName,
  showPreview,
  unoptimized,
}: ProductImagePreviewTriggerProps): JSX.Element {
  const previewImageUrl = hasImageUrl(imageUrl) ? imageUrl : null;

  return (
    <div
      className='group/image relative z-10 h-16 w-16 overflow-hidden rounded-md bg-slate-950'
      onMouseEnter={(event) => {
        if (previewImageUrl === null) return;
        showPreview({
          kind: 'image',
          imageUrl: previewImageUrl,
          productName,
          unoptimized,
          event,
        });
      }}
    >
      {previewImageUrl !== null ? (
        <>
          <Image
            src={previewImageUrl}
            alt={productName}
            fill
            sizes='64px'
            unoptimized={unoptimized}
            placeholder='blur'
            blurDataURL={BLUR_PLACEHOLDER}
            className='cursor-pointer rounded-md object-cover transition-[filter] duration-300 ease-in-out group-hover/image:brightness-70 group-hover/image:contrast-110'
            quality={75}
          />
          <div className='pointer-events-none absolute inset-0 rounded-md bg-[radial-gradient(circle,transparent_38%,rgba(15,23,42,0.58)_100%)] opacity-0 transition-opacity duration-300 ease-in-out group-hover/image:opacity-100' />
        </>
      ) : (
        <MissingImagePlaceholder className='size-16' />
      )}
    </div>
  );
}
