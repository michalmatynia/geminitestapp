import type { ProductListingCreateResponse } from '@/shared/contracts/integrations';
import type {
  PlaywrightRelistBrowserMode,
  ProductListingWithDetails,
} from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import {
  buildTraderaListingQueueJobId,
  enqueueTraderaListingJob,
  initializeQueues,
  TRADERA_LISTING_QUEUE_NAMES,
} from '@/features/jobs/server';

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildTraderaQueuedMarketplaceData = ({
  existingMarketplaceData,
  action,
  browserMode,
  requestId,
  queuedAt,
}: {
  existingMarketplaceData: unknown;
  action: 'list';
  browserMode: PlaywrightRelistBrowserMode;
  requestId: string;
  queuedAt: string;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  return {
    ...marketplaceData,
    marketplace: 'tradera',
    source: 'manual-listing',
    tradera: {
      ...traderaData,
      pendingExecution: {
        ...toRecord(traderaData['pendingExecution']),
        action,
        requestedBrowserMode: browserMode,
        requestId,
        queuedAt,
      },
    },
  };
};

export const enqueueTraderaCreateListingResponse = async ({
  listing,
  listingRepository,
  browserMode = 'connection_default',
  concurrencyMode,
}: {
  listing: ProductListingWithDetails;
  listingRepository: ProductListingRepository;
  browserMode?: PlaywrightRelistBrowserMode | null;
  concurrencyMode?: 'sequential' | 'concurrent' | null;
}): Promise<ProductListingCreateResponse> => {
  initializeQueues();
  const enqueuedAt = new Date().toISOString();
  const requestedBrowserMode = browserMode ?? 'connection_default';
  const traderaJobInput = {
    listingId: listing.id,
    action: 'list',
    source: 'api',
    browserMode: requestedBrowserMode,
  } as const;
  const jobId = buildTraderaListingQueueJobId(traderaJobInput);
  const queuedMarketplaceData = buildTraderaQueuedMarketplaceData({
    existingMarketplaceData: listing.marketplaceData,
    action: 'list',
    browserMode: requestedBrowserMode,
    requestId: jobId,
    queuedAt: enqueuedAt,
  });
  await listingRepository.updateListing(listing.id, {
    marketplaceData: queuedMarketplaceData,
  });

  try {
    const queuedJobId = await enqueueTraderaListingJob({
      ...traderaJobInput,
      jobId,
      ...(concurrencyMode !== null && concurrencyMode !== undefined ? { concurrencyMode } : {}),
    });
    return {
      ...listing,
      marketplaceData: queuedMarketplaceData,
      queued: true,
      queue: {
        name: TRADERA_LISTING_QUEUE_NAMES[concurrencyMode ?? 'sequential'],
        jobId: queuedJobId,
        enqueuedAt,
      },
    };
  } catch (error) {
    await listingRepository.updateListing(listing.id, {
      status: 'failed',
      failureReason:
        error instanceof Error
          ? error.message
          : 'Tradera listing could not be queued.',
    });
    throw error;
  }
};
