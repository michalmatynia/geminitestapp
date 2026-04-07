'use client';

import React from 'react';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import { useTraderaQuickListFeedback } from '@/features/integrations/hooks/useTraderaQuickListFeedback';
import { useVintedQuickListFeedback } from '@/features/integrations/hooks/useVintedQuickListFeedback';
import {
  useProductListingsData,
  useProductListingsModals,
} from '@/features/integrations/context/ProductListingsContext';
import {
  areProductListingsRecoveryContextsEqual,
  createTraderaRecoveryContext,
  createVintedRecoveryContext,
  findTraderaRecoveryListing,
  isVintedQuickExportRecoveryContext,
  mergeProductListingsRecoveryContext,
  resolveTraderaRecoveryMetadata,
  resolveTraderaRecoveryTarget,
} from '@/features/integrations/utils/product-listings-recovery';
import {
  persistTraderaQuickListFeedback,
  type PersistedTraderaQuickListFeedback,
} from '@/features/integrations/utils/traderaQuickListFeedback';
import { resolveTraderaRequestId } from '@/features/integrations/utils/tradera-listing-client-utils';
import {
  persistVintedQuickListFeedback,
  type PersistedVintedQuickListFeedback,
} from '@/features/integrations/utils/vintedQuickListFeedback';
import { resolveVintedRequestId } from '@/features/integrations/utils/vinted-listing-client-utils';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';

import { useProductListingsViewContext } from './context/ProductListingsViewContext';
import { renderProductListingItem } from './ProductListingItem';
import { ProductListingsScopedStatusPanel } from './ProductListingsScopedStatusPanel';
import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';
import { TraderaQuickExportSuccessBanner } from './TraderaQuickExportSuccessBanner';
import { VintedQuickExportRecoveryBanner } from './VintedQuickExportRecoveryBanner';
import { VintedQuickExportSuccessBanner } from './VintedQuickExportSuccessBanner';
import { SUCCESS_STATUSES, normalizeMarketplaceStatus } from '@/features/integrations/public';
import { findTrackedVintedListing } from '@/features/integrations/hooks/useVintedQuickExportFeedback';

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

const hasVintedAuthSignal = (value: string | null | undefined): boolean => {
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

const findFallbackVintedRecoveryListing = (
  listings: ProductListingWithDetails[],
  recoveryContext: ProductListingsRecoveryContext | null | undefined
): ProductListingWithDetails | null => {
  const requestId = recoveryContext?.requestId ?? null;
  if (requestId) {
    const byRequestId = listings.find(
      (listing) => resolveVintedRequestId(listing) === requestId
    );
    if (byRequestId) return byRequestId;
  }

  const integrationId = recoveryContext?.integrationId ?? null;
  const connectionId = recoveryContext?.connectionId ?? null;
  if (integrationId && connectionId) {
    const byConnection = listings.find(
      (listing) =>
        listing.integrationId === integrationId &&
        listing.connectionId === connectionId
    );
    if (byConnection) return byConnection;
  }

  return (
    listings.find((listing) => {
      const normalizedSlug = (listing.integration?.slug ?? '').trim().toLowerCase();
      const normalizedStatus = normalizeMarketplaceStatus(listing.status ?? '');
      return (
        normalizedSlug === 'vinted' &&
        ['auth_required', 'needs_login', 'failed'].includes(normalizedStatus)
      );
    }) ?? null
  );
};

export function ProductListingsContent(): React.JSX.Element {
  const { product } = useProductListingsData();
  const { filteredListings, statusTargetLabel, filterIntegrationSlug, isBaseFilter, showSync } =
    useProductListingsViewContext();
  const { recoveryContext, setRecoveryContext } = useProductListingsModals();
  const isVintedQuickExportRecovery = isVintedQuickExportRecoveryContext(recoveryContext);
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
  const fallbackVintedRecoveryListing = isVintedQuickExportRecovery
    ? findFallbackVintedRecoveryListing(filteredListings, recoveryContext)
    : null;
  const vintedRecoveryIntegrationId =
    recoveryContext?.integrationId ?? fallbackVintedRecoveryListing?.integrationId ?? null;
  const vintedRecoveryConnectionId =
    recoveryContext?.connectionId ?? fallbackVintedRecoveryListing?.connectionId ?? null;
  const vintedRecoveryFailureReason =
    (recoveryContext && 'failureReason' in recoveryContext
      ? recoveryContext.failureReason ?? null
      : null) ?? fallbackVintedRecoveryListing?.failureReason ?? null;
  const { feedback: persistedQuickListFeedback } = useTraderaQuickListFeedback(product.id);
  const { feedback: persistedVintedQuickListFeedback } = useVintedQuickListFeedback(product.id);
  const trackedSuccessListing =
    persistedQuickListFeedback?.status === 'completed'
      ? findTrackedTraderaListing(filteredListings, persistedQuickListFeedback)
      : null;
  const trackedVintedSuccessListing =
    persistedVintedQuickListFeedback?.status === 'completed'
      ? findTrackedVintedListing(filteredListings, persistedVintedQuickListFeedback)
      : null;
  const displayListings =
    persistedQuickListFeedback?.status === 'completed' && trackedSuccessListing
      ? filteredListings.map((listing) =>
          listing.id === trackedSuccessListing.id &&
          !SUCCESS_STATUSES.has(normalizeMarketplaceStatus(listing.status ?? ''))
            ? {
                ...listing,
                status: 'active',
              }
            : listing
        )
      : persistedVintedQuickListFeedback?.status === 'completed' && trackedVintedSuccessListing
        ? filteredListings.map((listing) =>
            listing.id === trackedVintedSuccessListing.id &&
            !SUCCESS_STATUSES.has(normalizeMarketplaceStatus(listing.status ?? ''))
              ? {
                  ...listing,
                  status: 'active',
                }
              : listing
          )
        : filteredListings;
  const displayScopedStatus =
    persistedQuickListFeedback?.status === 'completed' &&
    isTraderaIntegrationSlug(filterIntegrationSlug)
      ? 'active'
      : persistedVintedQuickListFeedback?.status === 'completed' &&
          filterIntegrationSlug === 'vinted'
        ? 'active'
        : displayListings[0]?.status ?? 'Unknown';
  const shouldShowQuickListSuccessBanner = Boolean(
    !isTraderaQuickExportRecovery &&
      persistedQuickListFeedback?.status === 'completed' &&
      (isTraderaIntegrationSlug(filterIntegrationSlug) || trackedSuccessListing)
  );
  const shouldShowVintedQuickListSuccessBanner = Boolean(
    !isVintedQuickExportRecovery &&
      persistedVintedQuickListFeedback?.status === 'completed' &&
      (filterIntegrationSlug === 'vinted' || trackedVintedSuccessListing)
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
  const vintedRecoveryStatus = normalizeMarketplaceStatus(
    recoveryContext?.status ?? fallbackVintedRecoveryListing?.status ?? ''
  );
  const canOpenVintedRecoveryLogin = Boolean(
    vintedRecoveryIntegrationId &&
      vintedRecoveryConnectionId &&
      (vintedRecoveryStatus === 'auth_required' ||
        vintedRecoveryStatus === 'needs_login' ||
        hasVintedAuthSignal(vintedRecoveryFailureReason))
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

  React.useEffect(() => {
    if (!isVintedQuickExportRecovery || !fallbackVintedRecoveryListing) return;

    const nextRecoveryContext: Extract<ProductListingsRecoveryContext, { integrationSlug: 'vinted' }> =
      createVintedRecoveryContext({
        source: recoveryContext?.source,
        status: recoveryContext?.status ?? fallbackVintedRecoveryListing.status ?? 'failed',
        runId: recoveryContext?.runId ?? null,
        requestId: recoveryContext?.requestId ?? resolveVintedRequestId(fallbackVintedRecoveryListing),
        integrationId: fallbackVintedRecoveryListing.integrationId ?? null,
        connectionId: fallbackVintedRecoveryListing.connectionId ?? null,
        failureReason:
          (recoveryContext && 'failureReason' in recoveryContext
            ? recoveryContext.failureReason ?? null
            : null) ?? fallbackVintedRecoveryListing.failureReason ?? null,
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

    persistVintedQuickListFeedback(
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
    fallbackVintedRecoveryListing,
    isVintedQuickExportRecovery,
    product.id,
    recoveryContext,
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
      {shouldShowVintedQuickListSuccessBanner && persistedVintedQuickListFeedback ? (
        <VintedQuickExportSuccessBanner
          mode='content'
          feedback={persistedVintedQuickListFeedback}
          listing={trackedVintedSuccessListing}
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
      {isVintedQuickExportRecovery && (
        <VintedQuickExportRecoveryBanner
          mode='content'
          status={recoveryContext?.status}
          requestId={recoveryContext?.requestId}
          runId={recoveryContext?.runId}
          integrationId={vintedRecoveryIntegrationId}
          connectionId={vintedRecoveryConnectionId}
          failureReason={vintedRecoveryFailureReason}
          canContinue={canOpenVintedRecoveryLogin}
        />
      )}
      {filterIntegrationSlug && (
        <ProductListingsScopedStatusPanel
          statusTargetLabel={statusTargetLabel}
          status={displayScopedStatus}
          isBaseFilter={isBaseFilter}
          showSync={showSync}
        />
      )}
      {displayListings.map((listing) => (
        <React.Fragment key={listing.id}>
          {renderProductListingItem({ listing })}
        </React.Fragment>
      ))}
    </div>
  );
}
