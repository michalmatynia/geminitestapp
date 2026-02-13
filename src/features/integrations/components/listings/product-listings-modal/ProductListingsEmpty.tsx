'use client';

import React from 'react';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

export function ProductListingsEmpty(): React.JSX.Element {
  const {
    filterIntegrationSlug,
    statusTargetLabel,
    isBaseFilter,
    showSync,
  } = useProductListingsViewContext();

  return (
    <div className='rounded-md border bg-card/50 px-4 py-8 text-center'>
      {filterIntegrationSlug ? (
        <div className='space-y-3'>
          <div className='text-sm text-gray-300'>
            {statusTargetLabel} status
          </div>
          <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-400'>
            Not connected.
          </div>
          {showSync && isBaseFilter && <ProductListingsSyncPanel />}
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='border-t border-border pt-3'>
            <p className='text-sm text-gray-400'>
              This product is not listed on any marketplace yet.
            </p>
            <p className='mt-2 text-xs text-gray-500'>
              Use the + button in the header to list products on a marketplace.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
