'use client';

import React from 'react';

import { EmptyState } from '@/shared/ui';

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
    <div className='space-y-4'>
      {filterIntegrationSlug ? (
        <div className='rounded-md border bg-card/50 px-4 py-8 text-center space-y-3'>
          <div className='text-sm text-gray-300'>
            {statusTargetLabel} status
          </div>
          <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-400'>
            Not connected.
          </div>
          {showSync && isBaseFilter && <ProductListingsSyncPanel />}
        </div>
      ) : (
        <EmptyState
          title='No listings found'
          description='This product is not listed on any marketplace yet. Use the + button in the header to list products on a marketplace.'
          className='py-12'
        />
      )}
    </div>
  );
}
