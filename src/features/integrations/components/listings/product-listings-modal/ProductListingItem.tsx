import React from 'react';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { Card } from '@/shared/ui';

import { ProductListingActions } from './listing-item/ProductListingActions';
import { ProductListingDetails } from './listing-item/ProductListingDetails';
import { ProductListingItemRuntimeContext } from './listing-item/ProductListingItemRuntimeContext';

export function ProductListingItem({
  listing,
}: {
  listing: ProductListingWithDetails;
}): React.JSX.Element {
  const runtimeValue = React.useMemo(() => ({ listing }), [listing]);

  return (
    <ProductListingItemRuntimeContext.Provider value={runtimeValue}>
      <Card variant='subtle' padding='md' className='flex items-center justify-between'>
        <ProductListingDetails />
        <ProductListingActions />
      </Card>
    </ProductListingItemRuntimeContext.Provider>
  );
}
