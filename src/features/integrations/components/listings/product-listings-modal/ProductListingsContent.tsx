'use client';

import React from 'react';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingItem } from './ProductListingItem';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

export function ProductListingsContent(): React.JSX.Element {
  const {
    filteredListings,
    statusTargetLabel,
    filterIntegrationSlug,
    isBaseFilter,
    showSync,
  } = useProductListingsViewContext();

  return (
    <div className='space-y-3'>
      {filterIntegrationSlug && (
        <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-300'>
          {statusTargetLabel} status: {filteredListings[0]?.status ?? 'Unknown'}
        </div>
      )}
      {showSync && isBaseFilter && <ProductListingsSyncPanel />}
      {filteredListings.map((listing) => (
        <ProductListingItem key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
