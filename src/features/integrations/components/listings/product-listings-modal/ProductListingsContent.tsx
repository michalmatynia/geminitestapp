import React from 'react';

import { Card } from '@/shared/ui';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { renderProductListingItem } from './ProductListingItem';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

export function ProductListingsContent(): React.JSX.Element {
  const { filteredListings, statusTargetLabel, filterIntegrationSlug, isBaseFilter, showSync } =
    useProductListingsViewContext();

  return (
    <div className='space-y-3'>
      {filterIntegrationSlug && (
        <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-300'>
          {statusTargetLabel} status: {filteredListings[0]?.status ?? 'Unknown'}
        </Card>
      )}
      {showSync && isBaseFilter && <ProductListingsSyncPanel />}
      {filteredListings.map((listing) => (
        <React.Fragment key={listing.id}>
          {renderProductListingItem({ listing })}
        </React.Fragment>
      ))}
    </div>
  );
}
