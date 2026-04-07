'use client';

import {
  BASE_INTEGRATION_SLUGS,
  PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG,
  TRADERA_INTEGRATION_SLUGS,
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type { ProductListingWithDetails, ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';

export type TraderaRecoveryContext = Extract<
  ProductListingsRecoveryContext,
  { integrationSlug: 'tradera' }
>;

export type TraderaRecoverySource = TraderaRecoveryContext['source'];
export type BaseRecoveryContext = Extract<
  ProductListingsRecoveryContext,
  { integrationSlug: 'baselinker' }
>;
export type VintedRecoveryContext = Extract<
  ProductListingsRecoveryContext,
  { integrationSlug: 'vinted' }
>;
export type VintedRecoverySource = VintedRecoveryContext['source'];

export const normalizeProductListingsIntegrationScope = (
  value: string | null | undefined
): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const readProductListingsRecoveryString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readOptionalDate = (value: unknown): number | null => {
  const normalized = readProductListingsRecoveryString(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isBaseQuickExportRecoveryContext = (
  recoveryContext?: ProductListingsRecoveryContext | null | undefined
): recoveryContext is BaseRecoveryContext =>
  recoveryContext?.source === 'base_quick_export_failed';

export const createBaseRecoveryContext = ({
  status,
  runId,
  requestId,
  integrationId,
  connectionId,
}: {
  status: string;
  runId: string | null;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
}): BaseRecoveryContext => ({
  source: 'base_quick_export_failed',
  integrationSlug: 'baselinker',
  status,
  runId,
  ...(requestId != null ? { requestId } : {}),
  ...(integrationId != null ? { integrationId } : {}),
  ...(connectionId != null ? { connectionId } : {}),
});

export const isTraderaQuickExportRecoveryContext = (
  recoveryContext?: ProductListingsRecoveryContext | null | undefined
): recoveryContext is TraderaRecoveryContext =>
  recoveryContext?.source === 'tradera_quick_export_auth_required' ||
  recoveryContext?.source === 'tradera_quick_export_failed';

export const isVintedQuickExportRecoveryContext = (
  recoveryContext?: ProductListingsRecoveryContext | null | undefined
): recoveryContext is VintedRecoveryContext =>
  recoveryContext?.source === 'vinted_quick_export_auth_required' ||
  recoveryContext?.source === 'vinted_quick_export_failed';

export const resolveProductListingsEmptyDescription = (
  recoveryContext?: ProductListingsRecoveryContext | null | undefined
): string => {
  if (isBaseQuickExportRecoveryContext(recoveryContext)) {
    return 'The last Base.com one-click export failed before a listing record was created. Use the options above to retry or choose a different connection.';
  }

  if (isTraderaQuickExportRecoveryContext(recoveryContext)) {
    const normalizedStatus = (recoveryContext.status ?? '').trim().toLowerCase();
    const failureReason =
      'failureReason' in recoveryContext &&
      typeof recoveryContext.failureReason === 'string' &&
      recoveryContext.failureReason.trim().length > 0
        ? recoveryContext.failureReason.trim()
        : null;
    if (
      failureReason &&
      normalizedStatus !== 'auth_required' &&
      normalizedStatus !== 'needs_login'
    ) {
      return failureReason;
    }
    return 'The last Tradera quick export stopped before a stable listing record was available. Open the Tradera login window if needed, then continue the Tradera listing flow from this modal.';
  }

  if (isVintedQuickExportRecoveryContext(recoveryContext)) {
    const normalizedStatus = (recoveryContext.status ?? '').trim().toLowerCase();
    const failureReason =
      'failureReason' in recoveryContext &&
      typeof recoveryContext.failureReason === 'string' &&
      recoveryContext.failureReason.trim().length > 0
        ? recoveryContext.failureReason.trim()
        : null;
    if (
      failureReason &&
      normalizedStatus !== 'auth_required' &&
      normalizedStatus !== 'needs_login'
    ) {
      return failureReason;
    }
    return 'The last Vinted.pl quick export stopped before a stable listing record was available. Refresh the Vinted browser session if needed, then retry the Vinted listing flow from this modal.';
  }

  return 'This product is not listed on any marketplace yet. Use the + button in the header to list products on a marketplace.';
};

export const resolveTraderaRecoverySource = (
  statusOrSource: string | null | undefined
): TraderaRecoverySource => {
  const normalized = statusOrSource?.trim().toLowerCase();
  return normalized === 'tradera_quick_export_auth_required' ||
    normalized === 'auth_required' ||
    normalized === 'needs_login'
    ? 'tradera_quick_export_auth_required'
    : 'tradera_quick_export_failed';
};

export const createTraderaRecoveryContext = ({
  status,
  runId,
  failureReason,
  requestId,
  integrationId,
  connectionId,
  source,
}: {
  status: string;
  runId: string | null;
  failureReason?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  source?: string | null | undefined;
}): TraderaRecoveryContext => ({
  source: resolveTraderaRecoverySource(source ?? status),
  integrationSlug: 'tradera',
  status,
  runId,
  failureReason: failureReason ?? null,
  requestId: requestId ?? null,
  integrationId: integrationId ?? null,
  connectionId: connectionId ?? null,
});

export const resolveVintedRecoverySource = (
  statusOrSource: string | null | undefined
): VintedRecoverySource => {
  const normalized = statusOrSource?.trim().toLowerCase();
  return normalized === 'vinted_quick_export_auth_required' ||
    normalized === 'auth_required' ||
    normalized === 'needs_login'
    ? 'vinted_quick_export_auth_required'
    : 'vinted_quick_export_failed';
};

export const createVintedRecoveryContext = ({
  status,
  runId,
  failureReason,
  requestId,
  integrationId,
  connectionId,
  source,
}: {
  status: string;
  runId: string | null;
  failureReason?: string | null | undefined;
  requestId?: string | null | undefined;
  integrationId?: string | null | undefined;
  connectionId?: string | null | undefined;
  source?: string | null | undefined;
}): VintedRecoveryContext => ({
  source: resolveVintedRecoverySource(source ?? status),
  integrationSlug: 'vinted',
  status,
  runId,
  failureReason: failureReason ?? null,
  requestId: requestId ?? null,
  integrationId: integrationId ?? null,
  connectionId: connectionId ?? null,
});

const normalizeRecoveryOptionalField = (value: unknown): string | null =>
  readProductListingsRecoveryString(value);

export const areProductListingsRecoveryContextsEqual = (
  left?: ProductListingsRecoveryContext | null | undefined,
  right?: ProductListingsRecoveryContext | null | undefined
): boolean => {
  if (!left && !right) return true;
  if (!left || !right) return false;

  return (
    left.source === right.source &&
    left.integrationSlug === right.integrationSlug &&
    left.status === right.status &&
    left.runId === right.runId &&
    normalizeRecoveryOptionalField(
      'failureReason' in left ? left.failureReason : null
    ) ===
      normalizeRecoveryOptionalField(
        'failureReason' in right ? right.failureReason : null
      ) &&
    normalizeRecoveryOptionalField(left.requestId) ===
      normalizeRecoveryOptionalField(right.requestId) &&
    normalizeRecoveryOptionalField(left.integrationId) ===
      normalizeRecoveryOptionalField(right.integrationId) &&
    normalizeRecoveryOptionalField(left.connectionId) ===
      normalizeRecoveryOptionalField(right.connectionId)
  );
};

export const mergeProductListingsRecoveryContext = (
  preferred?: ProductListingsRecoveryContext | null | undefined,
  fallback?: ProductListingsRecoveryContext | null | undefined
): ProductListingsRecoveryContext | null => {
  if (!preferred) return fallback ?? null;
  if (!fallback) return preferred;

  if (preferred.source !== fallback.source || preferred.integrationSlug !== fallback.integrationSlug) {
    return preferred;
  }

  return {
    ...fallback,
    ...preferred,
    runId: preferred.runId ?? fallback.runId ?? null,
    ...('failureReason' in preferred &&
    normalizeRecoveryOptionalField(preferred.failureReason) !== null
      ? { failureReason: normalizeRecoveryOptionalField(preferred.failureReason) }
      : 'failureReason' in fallback &&
          normalizeRecoveryOptionalField(fallback.failureReason) !== null
        ? { failureReason: normalizeRecoveryOptionalField(fallback.failureReason) }
        : {}),
    ...(normalizeRecoveryOptionalField(preferred.requestId) !== null
      ? { requestId: normalizeRecoveryOptionalField(preferred.requestId) }
      : normalizeRecoveryOptionalField(fallback.requestId) !== null
        ? { requestId: normalizeRecoveryOptionalField(fallback.requestId) }
        : {}),
    ...(normalizeRecoveryOptionalField(preferred.integrationId) !== null
      ? { integrationId: normalizeRecoveryOptionalField(preferred.integrationId) }
      : normalizeRecoveryOptionalField(fallback.integrationId) !== null
        ? { integrationId: normalizeRecoveryOptionalField(fallback.integrationId) }
        : {}),
    ...(normalizeRecoveryOptionalField(preferred.connectionId) !== null
      ? { connectionId: normalizeRecoveryOptionalField(preferred.connectionId) }
      : normalizeRecoveryOptionalField(fallback.connectionId) !== null
        ? { connectionId: normalizeRecoveryOptionalField(fallback.connectionId) }
        : {}),
  };
};

export const resolveProductListingsRecoveryIdentifiers = (
  recoveryContext?: ProductListingsRecoveryContext | null | undefined
): {
  requestId: string | null;
  runId: string | null;
  integrationId: string | null;
  connectionId: string | null;
} => {
  const record =
    recoveryContext && typeof recoveryContext === 'object'
      ? (recoveryContext as Record<string, unknown>)
      : null;

  return {
    requestId: readProductListingsRecoveryString(record?.['requestId']),
    runId: readProductListingsRecoveryString(record?.['runId']),
    integrationId: readProductListingsRecoveryString(record?.['integrationId']),
    connectionId: readProductListingsRecoveryString(record?.['connectionId']),
  };
};

const isTraderaRecoveryStatus = (status: string | null | undefined): boolean =>
  ['auth_required', 'failed', 'needs_login'].includes((status ?? '').trim().toLowerCase());

const resolveTraderaRecoveryRank = (listing: ProductListingWithDetails): number => {
  const normalizedStatus = (listing.status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'auth_required') return 3;
  if (normalizedStatus === 'needs_login') return 2;
  if (normalizedStatus === 'failed') return 1;
  return 0;
};

export const resolveTraderaRecoveryMetadata = (
  listing: ProductListingWithDetails
): {
  requestId: string | null;
  runId: string | null;
  executedAt: number | null;
  updatedAt: number | null;
  createdAt: number | null;
} => {
  const traderaData = toRecord(toRecord(listing.marketplaceData)['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);

  return {
    requestId: readProductListingsRecoveryString(lastExecution['requestId']),
    runId: readProductListingsRecoveryString(metadata['runId']),
    executedAt: readOptionalDate(lastExecution['executedAt']),
    updatedAt: readOptionalDate(listing.updatedAt),
    createdAt: readOptionalDate(listing.createdAt),
  };
};

const compareTraderaRecoveryListings = (
  left: ProductListingWithDetails,
  right: ProductListingWithDetails
): number => {
  const rankDelta = resolveTraderaRecoveryRank(right) - resolveTraderaRecoveryRank(left);
  if (rankDelta !== 0) return rankDelta;

  const leftMetadata = resolveTraderaRecoveryMetadata(left);
  const rightMetadata = resolveTraderaRecoveryMetadata(right);
  const leftTimestamp = leftMetadata.executedAt ?? leftMetadata.updatedAt ?? leftMetadata.createdAt ?? 0;
  const rightTimestamp =
    rightMetadata.executedAt ?? rightMetadata.updatedAt ?? rightMetadata.createdAt ?? 0;
  return rightTimestamp - leftTimestamp;
};

export const findTraderaRecoveryListing = (
  listings: ProductListingWithDetails[],
  recoveryRequestId: string | null,
  recoveryRunId: string | null
): ProductListingWithDetails | null => {
  const traderaListings = listings.filter((listing) =>
    isTraderaBrowserIntegrationSlug(listing.integration?.slug)
  );
  if (traderaListings.length === 0) return null;

  if (recoveryRequestId) {
    const requestMatch = traderaListings.find((listing) => {
      const metadata = resolveTraderaRecoveryMetadata(listing);
      return metadata.requestId === recoveryRequestId;
    });
    if (requestMatch) return requestMatch;
  }

  if (recoveryRunId) {
    const runMatch = traderaListings.find((listing) => {
      const metadata = resolveTraderaRecoveryMetadata(listing);
      return metadata.runId === recoveryRunId;
    });
    if (runMatch) return runMatch;
  }

  const recoveryCandidates = traderaListings
    .filter((listing) => isTraderaRecoveryStatus(listing.status))
    .sort(compareTraderaRecoveryListings);
  if (recoveryCandidates.length > 0) return recoveryCandidates[0] ?? null;

  return [...traderaListings].sort(compareTraderaRecoveryListings)[0] ?? null;
};

export const resolveTraderaRecoveryTarget = ({
  recoveryContext,
  fallbackIntegrationId,
  fallbackConnectionId,
}: {
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
  fallbackIntegrationId?: string | null | undefined;
  fallbackConnectionId?: string | null | undefined;
}): {
  isRecovery: boolean;
  requestId: string | null;
  runId: string | null;
  integrationId: string | null;
  connectionId: string | null;
  canContinue: boolean;
} => {
  const isRecovery = isTraderaQuickExportRecoveryContext(recoveryContext);
  const identifiers = resolveProductListingsRecoveryIdentifiers(recoveryContext);
  const integrationId = identifiers.integrationId ?? normalizeProductListingsIntegrationScope(fallbackIntegrationId);
  const connectionId = identifiers.connectionId ?? normalizeProductListingsIntegrationScope(fallbackConnectionId);

  return {
    isRecovery,
    requestId: identifiers.requestId,
    runId: identifiers.runId,
    integrationId,
    connectionId,
    canContinue: isRecovery && Boolean(integrationId && connectionId),
  };
};

export const resolveProductListingsIntegrationScope = ({
  filterIntegrationSlug,
  recoveryContext,
}: {
  filterIntegrationSlug?: string | null | undefined;
  recoveryContext?: ProductListingsRecoveryContext | null | undefined;
}): string | null =>
  normalizeProductListingsIntegrationScope(filterIntegrationSlug) ??
  normalizeProductListingsIntegrationScope(recoveryContext?.integrationSlug) ??
  null;

export const resolveProductListingsIntegrationScopeLabel = (
  filterIntegrationSlug: string | null | undefined
): string | null => {
  const filter = normalizeProductListingsIntegrationScope(filterIntegrationSlug)?.toLowerCase();
  if (!filter) return null;
  if (BASE_INTEGRATION_SLUGS.has(filter)) return 'Base.com';
  if (TRADERA_INTEGRATION_SLUGS.has(filter)) return 'Tradera';
  if (isVintedIntegrationSlug(filter)) return 'Vinted.pl';
  if (filter === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG) return 'Playwright';
  return filterIntegrationSlug?.trim() || null;
};

export const matchesProductListingsIntegrationScope = (
  listingSlug: string,
  filterIntegrationSlug: string | null | undefined
): boolean => {
  const filter = normalizeProductListingsIntegrationScope(filterIntegrationSlug)?.toLowerCase();
  if (!filter) return true;
  const listing = normalizeProductListingsIntegrationScope(listingSlug)?.toLowerCase() ?? '';
  if (BASE_INTEGRATION_SLUGS.has(filter)) {
    return BASE_INTEGRATION_SLUGS.has(listing);
  }
  if (TRADERA_INTEGRATION_SLUGS.has(filter)) {
    return TRADERA_INTEGRATION_SLUGS.has(listing);
  }
  return listing === filter;
};
