'use client';

import React from 'react';

import type { ImageRetryPreset } from '@/features/data-import-export';
import { ImageRetryDropdown, Alert } from '@/shared/ui';

type ProductListingsErrorProps = {
  error: string;
  isImageExportError: boolean;
  lastExportListingId: string | null;
  imageRetryPresets: ImageRetryPreset[];
  onImageRetry: (preset: ImageRetryPreset) => void;
  exportingListing: string | null;
};

export function ProductListingsError({
  error,
  isImageExportError: isImageError,
  lastExportListingId,
  imageRetryPresets,
  onImageRetry,
  exportingListing,
}: ProductListingsErrorProps): React.JSX.Element {
  return (
    <Alert variant='error'>
      <div className='flex flex-col gap-3'>
        <span>{error}</span>
        {isImageError && lastExportListingId ? (
          <div className='flex flex-wrap items-center gap-2'>
            <ImageRetryDropdown
              presets={imageRetryPresets}
              onRetry={onImageRetry}
              disabled={Boolean(exportingListing)}
            />
            <span className='text-xs text-red-200/80'>
              Applies JPEG resize/compression and retries automatically.
            </span>
          </div>
        ) : null}
      </div>
    </Alert>
  );
}
