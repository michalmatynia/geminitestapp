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
  productListingMoveToUnsoldPayloadSchema,
  type ProductListingMoveToUnsoldResponse,
} from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const IN_FLIGHT_MOVE_TO_UNSOLD_STALE_THRESHOLD_MS = 15 * 60 * 1000;

const resolvePendingExecutionQueuedAt = (marketplaceData: unknown): string | null => {
  const providerData = toRecord(toRecord(marketplaceData)['tradera']);
  const pendingExecution = toRecord(providerData['pendingExecution']);
  return readString(pendingExecution['queuedAt']);
};

const resolveKnownListingTarget = (marketplaceData: unknown): string | null => {
  const normalizedMarketplaceData = toRecord(marketplaceData);
  const traderaData = toRecord(normalizedMarketplaceData['tradera']);
  return (
    readString(normalizedMarketplaceData['listingUrl']) ??
    readString(traderaData['listingUrl']) ??
    readString(toRecord(traderaData['manualLink'])['listingUrl'])
  );
};

const isQueuedStatusStale = (
  updatedAt: string | Date | null | undefined,
  queuedAt: string | null
): boolean => {
  const candidate = queuedAt ?? updatedAt ?? null;
  if (!candidate) return true;
  const ts = typeof candidate === 'string' ? new Date(candidate).getTime() : candidate.getTime();
  return !Number.isFinite(ts) || Date.now() - ts > IN_FLIGHT_MOVE_TO_UNSOLD_STALE_THRESHOLD_MS;
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
  const payloadResult = productListingMoveToUnsoldPayloadSchema.safeParse(rawBody);
  if (!payloadResult.success) {
    throw badRequestError('Invalid move-to-unsold payload');
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
    throw badRequestError('Move to unsold is only supported for Tradera browser listings');
  }

  const normalizedStatus = (resolved.listing.status ?? '').trim().toLowerCase();
  if (['unsold', 'ended', 'sold', 'removed'].includes(normalizedStatus)) {
    throw badRequestError('Listing is already ended on Tradera');
  }

  const knownListingTarget =
    (resolved.listing.externalListingId ?? '').trim() ||
    resolveKnownListingTarget(resolved.listing.marketplaceData);
  if (!knownListingTarget) {
    throw badRequestError('Move to unsold requires a linked Tradera listing target.');
  }

  const isInFlightListingStatus =
    normalizedStatus === 'running' ||
    normalizedStatus === 'queued' ||
    normalizedStatus === 'queued_relist';
  const isStaleInFlightListing =
    isInFlightListingStatus &&
    isQueuedStatusStale(
      resolved.listing.updatedAt,
      resolvePendingExecutionQueuedAt(resolved.listing.marketplaceData)
    );
  if (!isStaleInFlightListing && isInFlightListingStatus) {
    const response: ProductListingMoveToUnsoldResponse = {
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    };
    return NextResponse.json(response);
  }

  await resolved.repository.updateListingStatus(listingId, 'queued_relist');
  await resolved.repository.updateListing(listingId, {
    expiresAt: null,
    nextRelistAt: null,
    failureReason: null,
    lastStatusCheckAt: new Date().toISOString(),
  });

  initializeQueues();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'move_to_unsold',
    source: 'manual',
    ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
    ...(payload.selectorProfile ? { selectorProfile: payload.selectorProfile } : {}),
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
          action: 'move_to_unsold',
          requestedBrowserMode: payload.browserMode ?? 'connection_default',
          ...(payload.selectorProfile
            ? { requestedSelectorProfile: payload.selectorProfile }
            : {}),
          requestId: jobId,
          queuedAt: enqueuedAt,
        },
      },
    },
  });

  const response: ProductListingMoveToUnsoldResponse = {
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
