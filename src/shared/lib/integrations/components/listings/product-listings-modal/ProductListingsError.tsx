'use client';

import React from 'react';

import { useImageRetryPresets } from '@/shared/lib/integrations/components/listings/useImageRetryPresets';
import { isImageExportError } from '@/shared/lib/integrations/components/listings/utils';
import { useProductListingsContext } from '@/shared/lib/integrations/context/ProductListingsContext';
import type { ImageRetryPreset } from '@/shared/contracts/integrations';
import { ImageRetryDropdown, Alert } from '@/shared/ui';

export function ProductListingsError(): React.JSX.Element {
  const { error, lastExportListingId, exportingListing, handleImageRetry } =
    useProductListingsContext();
  const imageRetryPresets: ImageRetryPreset[] = useImageRetryPresets();
  const isImageError = isImageExportError(error);

  return (
    <Alert variant='error'>
      <div className='flex flex-col gap-3'>
        <span>{error}</span>
        {isImageError && lastExportListingId ? (
          <div className='flex flex-wrap items-center gap-2'>
            <ImageRetryDropdown
              presets={imageRetryPresets}
              onRetry={(preset: ImageRetryPreset): void => {
                void handleImageRetry(preset);
              }}
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
