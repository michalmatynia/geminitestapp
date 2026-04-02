import React from 'react';

import {
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  isBaseQuickExportRecoveryContext,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import { EmptyState, Card } from '@/shared/ui';

import { BaseQuickExportFailureBanner } from './BaseQuickExportFailureBanner';
import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';

export function ProductListingsEmpty(): React.JSX.Element {
  const { filterIntegrationSlug, statusTargetLabel, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { recoveryContext } = useProductListingsModals();
  const isFailedBaseQuickExportRecovery = isBaseQuickExportRecoveryContext(recoveryContext);
  const {
    isRecovery: isTraderaQuickExportRecovery,
    requestId: recoveryRequestId,
    integrationId: recoveryIntegrationId,
    connectionId: recoveryConnectionId,
    canContinue: canOpenTraderaRecoveryLogin,
  } = resolveTraderaRecoveryTarget({
    recoveryContext,
  });

  return (
    <div className='space-y-4'>
      {isFailedBaseQuickExportRecovery && (
        <BaseQuickExportFailureBanner
          status={recoveryContext?.status}
          runId={recoveryContext?.runId}
        />
      )}
      {isTraderaQuickExportRecovery && (
        <TraderaQuickExportRecoveryBanner
          variant='full'
          title='Tradera quick export needs recovery'
          description='The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then continue directly into the Tradera listing flow from this modal.'
          status={recoveryContext?.status}
          requestId={recoveryRequestId}
          integrationId={canOpenTraderaRecoveryLogin ? recoveryIntegrationId : null}
          connectionId={canOpenTraderaRecoveryLogin ? recoveryConnectionId : null}
        />
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
              : isTraderaQuickExportRecovery
                ? 'The last Tradera quick export stopped before a stable listing record was available. Open the Tradera login window if needed, then continue the Tradera listing flow from this modal.'
              : 'This product is not listed on any marketplace yet. Use the + button in the header to list products on a marketplace.'
          }
          className='py-12'
        />
      )}
    </div>
  );
}
