import type { ProductListingCreateResponse } from '@/shared/contracts/integrations';
import type { ProductListingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import {
  buildTraderaListingQueueJobId,
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';

const toRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildTraderaQueuedMarketplaceData = ({
  existingMarketplaceData,
  action,
  requestId,
  queuedAt,
}: {
  existingMarketplaceData: unknown;
  action: 'list';
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
        requestedBrowserMode: 'connection_default',
        requestId,
        queuedAt,
      },
    },
  };
};

export const enqueueTraderaCreateListingResponse = async ({
  listing,
  listingRepository,
}: {
  listing: ProductListingWithDetails;
  listingRepository: ProductListingRepository;
}): Promise<ProductListingCreateResponse> => {
  initializeQueues();
  const enqueuedAt = new Date().toISOString();
  const traderaJobInput = {
    listingId: listing.id,
    action: 'list',
    source: 'api',
  } as const;
  const jobId = buildTraderaListingQueueJobId(traderaJobInput);
  const queuedMarketplaceData = buildTraderaQueuedMarketplaceData({
    existingMarketplaceData: listing.marketplaceData,
    action: 'list',
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
    });
    return {
      ...listing,
      marketplaceData: queuedMarketplaceData,
      queued: true,
      queue: {
        name: 'tradera-listings',
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
