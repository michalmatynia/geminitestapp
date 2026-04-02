import React from 'react';

import {
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  isBaseQuickExportRecoveryContext,
  resolveProductListingsEmptyDescription,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import { EmptyState } from '@/shared/ui';

import { BaseQuickExportFailureBanner } from './BaseQuickExportFailureBanner';
import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
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
          mode='empty'
          variant='full'
          status={recoveryContext?.status}
          requestId={recoveryRequestId}
          integrationId={canOpenTraderaRecoveryLogin ? recoveryIntegrationId : null}
          connectionId={canOpenTraderaRecoveryLogin ? recoveryConnectionId : null}
        />
      )}
      {filterIntegrationSlug ? (
        <ProductListingsScopedStatusPanel
          statusTargetLabel={statusTargetLabel}
          isBaseFilter={isBaseFilter}
          showSync={showSync}
        />
      ) : (
        <EmptyState
          title='No listings found'
          description={resolveProductListingsEmptyDescription(recoveryContext)}
          className='py-12'
        />
      )}
    </div>
  );
}
