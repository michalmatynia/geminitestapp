'use client';

import React from 'react';

import {
  useProductListingsData,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  areProductListingsRecoveryContextsEqual,
  createTraderaRecoveryContext,
  findTraderaRecoveryListing,
  mergeProductListingsRecoveryContext,
  resolveTraderaRecoveryMetadata,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import { persistTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { renderProductListingItem } from './ProductListingItem';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';

export function ProductListingsContent(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { filteredListings, statusTargetLabel, filterIntegrationSlug, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { recoveryContext, setRecoveryContext } = useProductListingsModals();
  const {
    isRecovery: isTraderaQuickExportRecovery,
    requestId: recoveryRequestId,
    runId: recoveryRunId,
    integrationId: recoveryIntegrationIdFromContext,
    connectionId: recoveryConnectionIdFromContext,
  } = resolveTraderaRecoveryTarget({
    recoveryContext,
  });
  const fallbackRecoveryListing = isTraderaQuickExportRecovery
    ? findTraderaRecoveryListing(filteredListings, recoveryRequestId, recoveryRunId)
    : null;
  const fallbackRecoveryMetadata = fallbackRecoveryListing
    ? resolveTraderaRecoveryMetadata(fallbackRecoveryListing)
    : null;
  const recoveryIntegrationId =
    recoveryIntegrationIdFromContext ?? fallbackRecoveryListing?.integrationId ?? null;
  const recoveryConnectionId =
    recoveryConnectionIdFromContext ?? fallbackRecoveryListing?.connectionId ?? null;
  const canOpenTraderaRecoveryLogin = Boolean(
    isTraderaQuickExportRecovery && recoveryIntegrationId && recoveryConnectionId
  );

  React.useEffect(() => {
    if (!isTraderaQuickExportRecovery || !fallbackRecoveryListing) return;

    const nextRecoveryContext: Extract<ProductListingsRecoveryContext, { integrationSlug: 'tradera' }> =
      createTraderaRecoveryContext({
        source: recoveryContext?.source,
        status: recoveryContext?.status ?? fallbackRecoveryListing.status ?? 'failed',
        runId: fallbackRecoveryMetadata?.runId ?? recoveryRunId ?? null,
        requestId: fallbackRecoveryMetadata?.requestId ?? recoveryRequestId ?? null,
        integrationId: fallbackRecoveryListing.integrationId ?? null,
        connectionId: fallbackRecoveryListing.connectionId ?? null,
      });

    setRecoveryContext((current) => {
      const mergedRecoveryContext = mergeProductListingsRecoveryContext(
        nextRecoveryContext,
        current
      );
      if (areProductListingsRecoveryContextsEqual(current, mergedRecoveryContext)) {
        return current;
      }
      return mergedRecoveryContext;
    });

    persistTraderaQuickListFeedback(
      product.id,
      nextRecoveryContext.status === 'auth_required' || nextRecoveryContext.status === 'needs_login'
        ? 'auth_required'
        : 'failed',
      {
      runId: nextRecoveryContext.runId,
      requestId: nextRecoveryContext.requestId,
      integrationId: nextRecoveryContext.integrationId,
      connectionId: nextRecoveryContext.connectionId,
      }
    );
  }, [
    fallbackRecoveryListing,
    fallbackRecoveryMetadata?.requestId,
    fallbackRecoveryMetadata?.runId,
    isTraderaQuickExportRecovery,
    product.id,
    recoveryContext?.source,
    recoveryContext?.status,
    recoveryRequestId,
    recoveryRunId,
    setRecoveryContext,
  ]);

  return (
    <div className='space-y-3'>
      {isTraderaQuickExportRecovery && (
        <TraderaQuickExportRecoveryBanner
          mode='content'
          status={recoveryContext?.status}
          requestId={recoveryRequestId}
          runId={recoveryRunId}
          integrationId={canOpenTraderaRecoveryLogin ? recoveryIntegrationId : null}
          connectionId={canOpenTraderaRecoveryLogin ? recoveryConnectionId : null}
        />
      )}
      {filterIntegrationSlug && (
        <ProductListingsScopedStatusPanel
          statusTargetLabel={statusTargetLabel}
          status={filteredListings[0]?.status ?? 'Unknown'}
          isBaseFilter={isBaseFilter}
          showSync={showSync}
        />
      )}
      {filteredListings.map((listing) => (
        <React.Fragment key={listing.id}>
          {renderProductListingItem({ listing })}
        </React.Fragment>
      ))}
    </div>
  );
}
