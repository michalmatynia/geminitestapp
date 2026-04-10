'use client';

import Image from 'next/image';
import React, { useMemo } from 'react';
import MissingImagePlaceholder from '@/shared/ui/missing-image-placeholder';
import { useProductImagePreview } from '@/features/products/context/ProductImagePreviewContext';

interface ProductImageCellProps {
  imageUrl: string | null;
  productName: string;
}

// Tiny SVG placeholder (64×64 dark rect) — renders instantly while the real image loads.
const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';

/**
 * Returns true for URLs that must bypass Next.js image optimization
 * (data URIs, blob URIs, and external hosts not in next.config remotePatterns).
 */
const shouldSkipOptimization = (url: string): boolean => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  // Local paths are handled by localPatterns in next.config.
  if (url.startsWith('/')) return false;
  try {
    const { hostname } = new URL(url);
    // Hosts configured in next.config.mjs remotePatterns.
    if (
      hostname === 'ik.imagekit.io' ||
      hostname === 'upload.cdn.baselinker.com' ||
      hostname === 'milkbardesigners.com'
    ) {
      return false;
    }
  } catch {
    // Malformed URL — skip optimization to avoid runtime error.
  }
  return true;
};

export const ProductImageCell = React.memo(function ProductImageCell({
  imageUrl,
  productName,
}: ProductImageCellProps): React.JSX.Element {
  const { showPreview, updatePreview, hidePreview } = useProductImagePreview();

  const unoptimized = useMemo(
    () => (imageUrl ? shouldSkipOptimization(imageUrl) : false),
    [imageUrl]
  );

  if (!imageUrl) {
    return <MissingImagePlaceholder className='size-16' />;
  }

  return (
    <div
      className='relative'
      onMouseEnter={(e) => showPreview({ imageUrl, productName, unoptimized, event: e })}
      onMouseLeave={hidePreview}
      onMouseMove={updatePreview}
    >
      <div className='relative h-16 w-16'>
        <Image
          src={imageUrl}
          alt={productName}
          fill
          sizes='64px'
          unoptimized={unoptimized}
          placeholder='blur'
          blurDataURL={BLUR_PLACEHOLDER}
          className='rounded-md object-cover cursor-pointer transition-opacity hover:opacity-80'
          quality={75}
        />
      </div>
    </div>
  );
});
