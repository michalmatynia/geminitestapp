'use client';

import React from 'react';

import { EmptyState, Card } from '@/shared/ui';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

export function ProductListingsEmpty(): React.JSX.Element {
  const { filterIntegrationSlug, statusTargetLabel, isBaseFilter, showSync } =
    useProductListingsViewContext();

  return (
    <div className='space-y-4'>
      {filterIntegrationSlug ? (
        <Card variant='subtle' padding='lg' className='bg-card/50 text-center space-y-3'>
          <div className='text-sm text-gray-300'>{statusTargetLabel} status</div>
          <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-400'>
            Not connected.
          </Card>
          {showSync && isBaseFilter && <ProductListingsSyncPanel />}
        </Card>
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
