'use client';

import React from 'react';

import { Card } from '@/shared/ui';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations';
import { ProductListingDetails } from './listing-item/ProductListingDetails';
import { ProductListingActions } from './listing-item/ProductListingActions';

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
