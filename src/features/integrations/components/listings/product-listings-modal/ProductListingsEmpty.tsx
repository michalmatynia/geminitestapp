import React from 'react';

import {
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  isBaseQuickExportRecoveryContext,
  resolveProductListingsEmptyDescription,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';

import { BaseQuickExportFailureBanner } from './BaseQuickExportFailureBanner';
import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';

const hasTraderaAuthSignal = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('login') ||
    normalized.includes('verification') ||
    normalized.includes('captcha') ||
    normalized.includes('auth') ||
    normalized.includes('session expired')
  );
};

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
  } = resolveTraderaRecoveryTarget({
    recoveryContext,
  });
  const recoveryStatus = (recoveryContext?.status ?? '').trim().toLowerCase();
  const recoveryFailureReason =
    recoveryContext && 'failureReason' in recoveryContext
      ? recoveryContext.failureReason ?? null
      : null;
  const canOpenTraderaRecoveryLogin =
    Boolean(recoveryIntegrationId && recoveryConnectionId) &&
    (recoveryStatus === 'auth_required' ||
      recoveryStatus === 'needs_login' ||
      hasTraderaAuthSignal(recoveryFailureReason));

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
          failureReason={recoveryFailureReason}
          canContinue={canOpenTraderaRecoveryLogin}
          integrationId={recoveryIntegrationId}
          connectionId={recoveryConnectionId}
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
          description={
            isFailedBaseQuickExportRecovery || isTraderaQuickExportRecovery
              ? undefined
              : resolveProductListingsEmptyDescription(recoveryContext)
          }
          className='py-12'
        />
      )}
    </div>
  );
}
