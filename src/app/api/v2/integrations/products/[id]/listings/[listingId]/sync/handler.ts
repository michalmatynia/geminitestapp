import { type NextRequest, NextResponse } from 'next/server';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import {
  resolveLatestCheckedTraderaStatusFromMarketplaceData,
} from '@/features/integrations/utils/tradera-listing-status';
import { productListingSyncPayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingSyncResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

// Sync runs are sequencer-based browser jobs. Allow the same stale-run recovery window as relist
// so a stuck queued/running Tradera sync does not block manual retry forever.
const IN_FLIGHT_SYNC_STALE_THRESHOLD_MS = 15 * 60 * 1000;

const formatPendingTraderaAction = (value: string | null): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'relist':
      return 'relist';
    case 'move_to_unsold':
      return 'end listing';
    case 'check_status':
      return 'status check';
    case 'list':
      return 'listing run';
    case 'sync':
      return 'sync';
    default:
      return 'listing action';
  }
};

const resolvePersistedTraderaListingUrl = (marketplaceData: unknown): string | null => {
  const marketplaceRecord = toRecord(marketplaceData);
  const traderaData = toRecord(marketplaceRecord['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  return (
    readString(marketplaceRecord['listingUrl']) ??
    readString(traderaData['listingUrl']) ??
    readString(lastExecution['listingUrl'])
  );
};

const resolvePendingExecutionQueuedAt = (marketplaceData: unknown): string | null => {
  const providerData = toRecord(toRecord(marketplaceData)['tradera']);
  const pendingExecution = toRecord(providerData['pendingExecution']);
  return readString(pendingExecution['queuedAt']);
};

const isQueuedStatusStale = (
  updatedAt: string | Date | null | undefined,
  queuedAt: string | null
): boolean => {
  const candidate = queuedAt ?? updatedAt ?? null;
  if (!candidate) return true;
  const ts = typeof candidate === 'string' ? new Date(candidate).getTime() : candidate.getTime();
  return !Number.isFinite(ts) || Date.now() - ts > IN_FLIGHT_SYNC_STALE_THRESHOLD_MS;
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }

  const rawBody: unknown = await req.json().catch(() => ({}));
  const payloadResult = productListingSyncPayloadSchema.safeParse(rawBody);
  if (!payloadResult.success) {
    throw badRequestError('Invalid sync payload');
  }
  const payload = payloadResult.data;

  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (resolved?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { productId, listingId });
  }

  const integrationRepository = await getIntegrationRepository();
  const integration = await integrationRepository.getIntegrationById(
    resolved.listing.integrationId
  );
  const integrationSlug = integration?.slug ?? '';
  if (!isTraderaBrowserIntegrationSlug(integrationSlug)) {
    throw badRequestError('Sync is only supported for Tradera browser listings');
  }

  const normalizedStatus = (resolved.listing.status ?? '').trim().toLowerCase();
  const traderaData = toRecord(toRecord(resolved.listing.marketplaceData)['tradera']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const pendingTraderaAction =
    readString(pendingExecution['action'])?.trim().toLowerCase() ?? null;
  const effectiveTraderaStatus =
    resolveLatestCheckedTraderaStatusFromMarketplaceData(resolved.listing.marketplaceData) ??
    normalizedStatus;
  const persistedListingUrl = resolvePersistedTraderaListingUrl(
    resolved.listing.marketplaceData
  );
  if (!readString(resolved.listing.externalListingId) && !persistedListingUrl) {
    throw badRequestError(
      'Sync requires an existing Tradera listing URL or external listing ID'
    );
  }
  if (['ended', 'unsold', 'sold', 'removed'].includes(effectiveTraderaStatus)) {
    throw badRequestError(
      'Sync is not available for ended, unsold, sold, or removed Tradera listings. Use relist instead.'
    );
  }
  const isInFlightSyncStatus =
    normalizedStatus === 'running' ||
    normalizedStatus === 'queued_relist' ||
    normalizedStatus === 'queued' ||
    normalizedStatus === 'pending' ||
    normalizedStatus === 'processing' ||
    normalizedStatus === 'in_progress';
  const isStaleInFlightSync =
    isInFlightSyncStatus &&
    isQueuedStatusStale(
      resolved.listing.updatedAt,
      resolvePendingExecutionQueuedAt(resolved.listing.marketplaceData)
    );
  if (!isStaleInFlightSync && isInFlightSyncStatus) {
    if (pendingTraderaAction && pendingTraderaAction !== 'sync') {
      throw badRequestError(
        `Sync is not available while a Tradera ${formatPendingTraderaAction(
          pendingTraderaAction
        )} is queued or running.`
      );
    }
    const response: ProductListingSyncResponse = {
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    };

    return NextResponse.json(response);
  }

  await resolved.repository.updateListingStatus(listingId, 'queued');
  await resolved.repository.updateListing(listingId, {
    nextRelistAt: null,
    failureReason: null,
  });

  initializeQueues();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'sync',
    source: 'manual',
    ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
    ...(payload.selectorProfile ? { selectorProfile: payload.selectorProfile } : {}),
    ...(payload.skipImages ? { syncSkipImages: true } : {}),
  });
  const enqueuedAt = new Date().toISOString();
  const previousMarketplaceData = toRecord(resolved.listing.marketplaceData);
  const previousTraderaData = toRecord(previousMarketplaceData['tradera']);
  await resolved.repository.updateListing(listingId, {
    marketplaceData: {
      ...previousMarketplaceData,
      marketplace: 'tradera',
      tradera: {
        ...previousTraderaData,
        pendingExecution: {
          action: 'sync',
          requestedBrowserMode: payload.browserMode ?? 'connection_default',
          ...(payload.selectorProfile ? { requestedSelectorProfile: payload.selectorProfile } : {}),
          requestId: jobId,
          queuedAt: enqueuedAt,
          ...(payload.skipImages ? { skipImages: true } : {}),
        },
      },
    },
  });

  const response: ProductListingSyncResponse = {
    queued: true,
    listingId,
    queue: {
      name: 'tradera-listings',
      jobId,
      enqueuedAt,
    },
  };

  return NextResponse.json(response);
}
