'use client';

import React from 'react';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
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
import {
  persistTraderaQuickListFeedback,
  readPersistedTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
} from '@/features/integrations/utils/traderaQuickListFeedback';
import { resolveTraderaRequestId } from '@/features/integrations/utils/tradera-listing-client-utils';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { renderProductListingItem } from './ProductListingItem';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';
import { TraderaQuickExportSuccessBanner } from './TraderaQuickExportSuccessBanner';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

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

const findTrackedTraderaListing = (
  listings: ProductListingWithDetails[],
  feedback: PersistedTraderaQuickListFeedback
): ProductListingWithDetails | null => {
  if (feedback.listingId) {
    const listingById = listings.find((listing) => listing.id === feedback.listingId);
    if (listingById) return listingById;
  }

  if (feedback.requestId) {
    const listingByRequestId = listings.find(
      (listing) => resolveTraderaRequestId(listing) === feedback.requestId
    );
    if (listingByRequestId) return listingByRequestId;
  }

  if (feedback.externalListingId) {
    const listingByExternalId = listings.find(
      (listing) => listing.externalListingId === feedback.externalListingId
    );
    if (listingByExternalId) return listingByExternalId;
  }

  return null;
};

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
  const fallbackRecoveryTraderaData = toRecord(
    toRecord(fallbackRecoveryListing?.marketplaceData)['tradera']
  );
  const fallbackRecoveryLastExecution = toRecord(fallbackRecoveryTraderaData['lastExecution']);
  const fallbackRecoveryErrorCategory = (
    readString(fallbackRecoveryLastExecution['errorCategory']) ??
    readString(fallbackRecoveryTraderaData['lastErrorCategory']) ??
    ''
  )
    .trim()
    .toLowerCase();
  const fallbackRecoveryError = readString(fallbackRecoveryLastExecution['error']);
  const fallbackRecoveryFailureReason = fallbackRecoveryListing?.failureReason ?? null;
  const persistedQuickListFeedback = readPersistedTraderaQuickListFeedback(product.id);
  const trackedSuccessListing =
    persistedQuickListFeedback?.status === 'completed'
      ? findTrackedTraderaListing(filteredListings, persistedQuickListFeedback)
      : null;
  const shouldShowQuickListSuccessBanner = Boolean(
    !isTraderaQuickExportRecovery &&
      persistedQuickListFeedback?.status === 'completed' &&
      (isTraderaIntegrationSlug(filterIntegrationSlug) || trackedSuccessListing)
  );
  const recoveryNeedsManualLogin =
    isTraderaQuickExportRecovery &&
    ((recoveryContext?.status ?? '').trim().toLowerCase() === 'auth_required' ||
      (recoveryContext?.status ?? '').trim().toLowerCase() === 'needs_login' ||
      (fallbackRecoveryListing?.status ?? '').trim().toLowerCase() === 'auth_required' ||
      (fallbackRecoveryListing?.status ?? '').trim().toLowerCase() === 'needs_login' ||
      fallbackRecoveryErrorCategory === 'auth' ||
      hasTraderaAuthSignal(fallbackRecoveryError) ||
      hasTraderaAuthSignal(fallbackRecoveryFailureReason));
  const canOpenTraderaRecoveryLogin = Boolean(
    recoveryNeedsManualLogin && recoveryIntegrationId && recoveryConnectionId
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
      {shouldShowQuickListSuccessBanner && persistedQuickListFeedback ? (
        <TraderaQuickExportSuccessBanner
          mode='content'
          feedback={persistedQuickListFeedback}
          listing={trackedSuccessListing}
        />
      ) : null}
      {isTraderaQuickExportRecovery && (
        <TraderaQuickExportRecoveryBanner
          mode='content'
          status={recoveryContext?.status}
          requestId={recoveryRequestId}
          runId={recoveryRunId}
          failureReason={fallbackRecoveryFailureReason}
          canContinue={canOpenTraderaRecoveryLogin}
          integrationId={recoveryIntegrationId}
          connectionId={recoveryConnectionId}
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
