import React from 'react';

import {
  isTraderaIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useTraderaQuickListFeedback } from '@/features/integrations/hooks/useTraderaQuickListFeedback';
import { useVintedQuickListFeedback } from '@/features/integrations/hooks/useVintedQuickListFeedback';
import {
  useProductListingsData,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  isBaseQuickExportRecoveryContext,
  isVintedQuickExportRecoveryContext,
  resolveProductListingsEmptyDescription,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import { isVintedGoogleSignInBlockedMessage } from '@/features/integrations/utils/vinted-browser-messages';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';

import { BaseQuickExportFailureBanner } from './BaseQuickExportFailureBanner';
import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';
import { TraderaQuickExportSuccessBanner } from './TraderaQuickExportSuccessBanner';
import { VintedQuickExportRecoveryBanner } from './VintedQuickExportRecoveryBanner';
import { VintedQuickExportSuccessBanner } from './VintedQuickExportSuccessBanner';

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

const hasVintedAuthSignal = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('auth_required') ||
    normalized.includes('login') ||
    normalized.includes('verification') ||
    normalized.includes('captcha') ||
    normalized.includes('auth') ||
    normalized.includes('session expired') ||
    isVintedGoogleSignInBlockedMessage(normalized)
  );
};

export function ProductListingsEmpty(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { filterIntegrationSlug, statusTargetLabel, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { recoveryContext } = useProductListingsModals();
  const isFailedBaseQuickExportRecovery = isBaseQuickExportRecoveryContext(recoveryContext);
  const isVintedQuickExportRecovery = isVintedQuickExportRecoveryContext(recoveryContext);
  const isScopedToTradera = isTraderaIntegrationSlug(filterIntegrationSlug);
  const isScopedToVinted = isVintedIntegrationSlug(filterIntegrationSlug);
  const {
    isRecovery: isTraderaQuickExportRecovery,
    requestId: recoveryRequestId,
    integrationId: recoveryIntegrationId,
    connectionId: recoveryConnectionId,
  } = resolveTraderaRecoveryTarget({
    recoveryContext,
  });
  const shouldUseTraderaRecovery =
    isTraderaQuickExportRecovery && !isScopedToVinted;
  const shouldUseVintedRecovery =
    isVintedQuickExportRecovery && !isScopedToTradera;
  const recoveryStatus = (recoveryContext?.status ?? '').trim().toLowerCase();
  const recoveryFailureReason =
    recoveryContext && 'failureReason' in recoveryContext
      ? recoveryContext.failureReason ?? null
      : null;
  const canOpenTraderaRecoveryLogin =
    shouldUseTraderaRecovery &&
    Boolean(recoveryIntegrationId && recoveryConnectionId) &&
    (recoveryStatus === 'auth_required' ||
      recoveryStatus === 'needs_login' ||
      hasTraderaAuthSignal(recoveryFailureReason));
  const vintedRecoveryIntegrationId = shouldUseVintedRecovery
    ? recoveryContext?.integrationId ?? null
    : null;
  const vintedRecoveryConnectionId = shouldUseVintedRecovery
    ? recoveryContext?.connectionId ?? null
    : null;
  const canOpenVintedRecoveryLogin =
    shouldUseVintedRecovery &&
    Boolean(vintedRecoveryIntegrationId && vintedRecoveryConnectionId) &&
    (recoveryStatus === 'auth_required' ||
      recoveryStatus === 'needs_login' ||
      hasVintedAuthSignal(recoveryFailureReason));
  const { feedback: persistedQuickListFeedback } = useTraderaQuickListFeedback(product.id);
  const { feedback: persistedVintedQuickListFeedback } = useVintedQuickListFeedback(product.id);
  const shouldShowQuickListSuccessBanner = Boolean(
    !shouldUseTraderaRecovery &&
      persistedQuickListFeedback?.status === 'completed' &&
      isTraderaIntegrationSlug(filterIntegrationSlug)
  );
  const shouldShowVintedQuickListSuccessBanner = Boolean(
    !shouldUseVintedRecovery &&
      persistedVintedQuickListFeedback?.status === 'completed' &&
      filterIntegrationSlug === 'vinted'
  );

  return (
    <div className='space-y-4'>
      {shouldShowQuickListSuccessBanner && persistedQuickListFeedback ? (
        <TraderaQuickExportSuccessBanner
          mode='empty'
          variant='full'
          feedback={persistedQuickListFeedback}
        />
      ) : null}
      {shouldShowVintedQuickListSuccessBanner && persistedVintedQuickListFeedback ? (
        <VintedQuickExportSuccessBanner
          mode='empty'
          variant='full'
          feedback={persistedVintedQuickListFeedback}
        />
      ) : null}
      {isFailedBaseQuickExportRecovery && (
        <BaseQuickExportFailureBanner
          status={recoveryContext?.status}
          runId={recoveryContext?.runId}
          failureReason={recoveryFailureReason}
        />
      )}
      {shouldUseTraderaRecovery && (
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
      {shouldUseVintedRecovery && (
        <VintedQuickExportRecoveryBanner
          mode='empty'
          variant='full'
          status={recoveryContext?.status}
          requestId={recoveryContext?.requestId}
          runId={recoveryContext?.runId}
          integrationId={vintedRecoveryIntegrationId}
          connectionId={vintedRecoveryConnectionId}
          failureReason={recoveryFailureReason}
          canContinue={canOpenVintedRecoveryLogin}
        />
      )}
      {shouldShowQuickListSuccessBanner || shouldShowVintedQuickListSuccessBanner ? null : filterIntegrationSlug ? (
        <ProductListingsScopedStatusPanel
          statusTargetLabel={statusTargetLabel}
          isBaseFilter={isBaseFilter}
          showSync={showSync}
        />
      ) : (
        <EmptyState
          title='No listings found'
          description={
            isFailedBaseQuickExportRecovery ||
            shouldUseTraderaRecovery ||
            shouldUseVintedRecovery
              ? undefined
              : resolveProductListingsEmptyDescription(recoveryContext)
          }
          className='py-12'
        />
      )}
    </div>
  );
}
