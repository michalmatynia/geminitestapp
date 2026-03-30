'use client';

import React from 'react';

import { EmptyState, Card } from '@/shared/ui';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { useProductListingsModals } from '@/features/integrations/context/ProductListingsContext';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

export function ProductListingsEmpty(): React.JSX.Element {
  const { filterIntegrationSlug, statusTargetLabel, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { recoveryContext } = useProductListingsModals();
  const isFailedBaseQuickExportRecovery = recoveryContext?.source === 'base_quick_export_failed';

  return (
    <div className='space-y-4'>
      {isFailedBaseQuickExportRecovery && (
        <Card variant='subtle' padding='lg' className='bg-card/50 space-y-3'>
          <div className='space-y-1 text-center'>
            <div className='text-sm font-semibold text-white'>Previous Base.com export failed</div>
            <p className='text-xs text-gray-300'>
              The one-click export did not create a saved marketplace listing. Review the last
              failure details below, then use the options above to retry with a connection.
            </p>
          </div>
          <div className='grid gap-2 text-xs text-gray-300 sm:grid-cols-2'>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Status
              </div>
              <div className='font-mono text-white'>{recoveryContext.status}</div>
            </div>
            <div className='rounded-md border border-white/10 bg-card/60 px-3 py-2'>
              <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                Run ID
              </div>
              <div className='font-mono text-white'>{recoveryContext.runId ?? 'Unavailable'}</div>
            </div>
          </div>
        </Card>
      )}
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
          description={
            isFailedBaseQuickExportRecovery
              ? 'The last Base.com one-click export failed before a listing record was created. Use the options above to retry or choose a different connection.'
              : 'This product is not listed on any marketplace yet. Use the + button in the header to list products on a marketplace.'
          }
          className='py-12'
        />
      )}
    </div>
  );
}
