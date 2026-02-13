'use client';

import React from 'react';

import type { ProductListingWithDetails } from '@/features/integrations/types/listings';

import { ProductListingItem } from './ProductListingItem';

type ProductListingsContentProps = {
  filteredListings: ProductListingWithDetails[];
  statusTargetLabel: string;
  filterIntegrationSlug: string | null | undefined;
  isBaseFilter: boolean;
  showSync: boolean;
  SyncPanel?: React.ComponentType<object>;
};

export function ProductListingsContent({
  filteredListings,
  statusTargetLabel,
  filterIntegrationSlug,
  isBaseFilter,
  showSync,
  SyncPanel,
}: ProductListingsContentProps): React.JSX.Element {
  return (
    <div className='space-y-3'>
      {filterIntegrationSlug && (
        <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-xs text-gray-300'>
          {statusTargetLabel} status: {filteredListings[0]?.status ?? 'Unknown'}
        </div>
      )}
      {showSync && isBaseFilter && SyncPanel && <SyncPanel />}
      {filteredListings.map((listing: ProductListingWithDetails) => (
        <ProductListingItem key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
