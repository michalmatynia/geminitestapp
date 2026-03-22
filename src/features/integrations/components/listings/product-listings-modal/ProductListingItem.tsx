import React from 'react';

import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { Card } from '@/shared/ui';

import { ProductListingActions } from './listing-item/ProductListingActions';
import { ProductListingDetails } from './listing-item/ProductListingDetails';

export function ProductListingItem({
  listing,
}: {
  listing: ProductListingWithDetails;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='flex items-center justify-between'>
      <ProductListingDetails listing={listing} />
      <ProductListingActions listing={listing} />
    </Card>
  );
}
