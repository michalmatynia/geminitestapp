import React from 'react';

import { Card } from '@/shared/ui/primitives.public';

import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

type ProductListingsScopedStatusPanelProps = {
  statusTargetLabel: string;
  status?: string | null | undefined;
  isBaseFilter: boolean;
  showSync: boolean;
};

export function ProductListingsScopedStatusPanel({
  statusTargetLabel,
  status,
  isBaseFilter,
  showSync,
}: ProductListingsScopedStatusPanelProps): React.JSX.Element {
  const shouldShowSyncPanel = showSync && isBaseFilter;
  const normalizedStatus = status?.trim() || null;

  if (normalizedStatus) {
    return (
      <>
        <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-300'>
          {statusTargetLabel} status: {normalizedStatus}
        </Card>
        {shouldShowSyncPanel && <ProductListingsSyncPanel />}
      </>
    );
  }

  return (
    <Card variant='subtle' padding='lg' className='bg-card/50 text-center space-y-3'>
      <div className='text-sm text-gray-300'>{statusTargetLabel} status</div>
      <Card variant='subtle-compact' padding='sm' className='bg-card/60 text-xs text-gray-400'>
        Not connected.
      </Card>
      {shouldShowSyncPanel && <ProductListingsSyncPanel />}
    </Card>
  );
}
