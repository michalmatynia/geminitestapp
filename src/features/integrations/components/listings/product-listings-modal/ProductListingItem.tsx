import React from 'react';

import { Card } from '@/shared/ui';

import { ProductListingActions } from './listing-item/ProductListingActions';
import { ProductListingDetails } from './listing-item/ProductListingDetails';
import type { ProductListingWithDetailsProps } from './listing-item/types';

type ProductListingItemProps = ProductListingWithDetailsProps;

export function ProductListingItem({
  listing,
}: ProductListingItemProps): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='flex items-center justify-between'>
      <ProductListingDetails listing={listing} />
      <ProductListingActions listing={listing} />
    </Card>
  );
}

export const renderProductListingItem = (props: ProductListingItemProps): React.JSX.Element => (
  <ProductListingItem {...props} />
);
