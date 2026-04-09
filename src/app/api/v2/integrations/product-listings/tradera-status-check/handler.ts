import { NextRequest, NextResponse } from 'next/server';

import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  getIntegrationRepository,
  getProductListingRepository,
} from '@/features/integrations/server';
import {
  buildQueuedTraderaStatusCheckMarketplaceData,
  isTraderaStatusCheckPending,
  selectPreferredTraderaListingForStatusCheck,
} from '@/features/integrations/utils/tradera-status-check';
import {
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import {
  traderaListingStatusCheckBatchPayloadSchema,
  type TraderaListingStatusCheckBatchItem,
  type TraderaListingStatusCheckBatchResponse,
} from '@/shared/contracts/integrations/listings';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const normalizeRequestedProductIds = (productIds: readonly string[]): string[] =>
  Array.from(
    new Set(productIds.map((value) => value.trim()).filter((value) => value.length > 0))
  );

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, traderaListingStatusCheckBatchPayloadSchema, {
    logPrefix: 'integrations.product-listings.tradera-status-check.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const requestedProductIds = normalizeRequestedProductIds(parsed.data.productIds);
  const listingRepository = await getProductListingRepository();
  const integrationRepository = await getIntegrationRepository();
  const [listings, integrations] = await Promise.all([
    listingRepository.getListingsByProductIds(requestedProductIds),
    integrationRepository.listIntegrations(),
  ]);

  const integrationSlugById = new Map(
    integrations.map((integration) => [integration.id, integration.slug])
  );
  const listingsByProductId = new Map<string, typeof listings>();
  listings.forEach((listing) => {
    const current = listingsByProductId.get(listing.productId);
    if (current) {
      current.push(listing);
      return;
    }
    listingsByProductId.set(listing.productId, [listing]);
  });

  const resultByProductId = new Map<string, TraderaListingStatusCheckBatchItem>();
  const queueCandidates: Array<{
    productId: string;
    listing: (typeof listings)[number];
  }> = [];

  for (const productId of requestedProductIds) {
    const productListings = listingsByProductId.get(productId) ?? [];
    const browserListings = productListings.filter((listing) =>
      isTraderaBrowserIntegrationSlug(integrationSlugById.get(listing.integrationId))
    );
    const selectedListing =
      selectPreferredTraderaListingForStatusCheck(browserListings);

    if (!selectedListing) {
      resultByProductId.set(productId, {
        productId,
        listingId: null,
        status: 'skipped',
        message: 'No Tradera browser listing available for live status check.',
      });
      continue;
    }

    if (isTraderaStatusCheckPending(selectedListing)) {
      resultByProductId.set(productId, {
        productId,
        listingId: selectedListing.id,
        status: 'already_queued',
        message: 'Live status check already queued for this listing.',
      });
      continue;
    }

    queueCandidates.push({ productId, listing: selectedListing });
  }

  if (queueCandidates.length > 0) {
    initializeQueues();
  }

  for (const candidate of queueCandidates) {
    try {
      const jobId = await enqueueTraderaListingJob({
        listingId: candidate.listing.id,
        action: 'check_status',
        source: 'manual',
      });
      const enqueuedAt = new Date().toISOString();
      await listingRepository.updateListing(candidate.listing.id, {
        marketplaceData: buildQueuedTraderaStatusCheckMarketplaceData({
          existingMarketplaceData: candidate.listing.marketplaceData,
          requestId: jobId,
          queuedAt: enqueuedAt,
        }),
      });
      resultByProductId.set(candidate.productId, {
        productId: candidate.productId,
        listingId: candidate.listing.id,
        status: 'queued',
        queue: {
          name: 'tradera-listings',
          jobId,
          enqueuedAt,
        },
      });
    } catch (error) {
      resultByProductId.set(candidate.productId, {
        productId: candidate.productId,
        listingId: candidate.listing.id,
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to queue live status check.',
      });
    }
  }

  const results = requestedProductIds
    .map((productId) => resultByProductId.get(productId))
    .filter((result): result is TraderaListingStatusCheckBatchItem => Boolean(result));

  const response: TraderaListingStatusCheckBatchResponse = {
    total: requestedProductIds.length,
    queued: results.filter((result) => result.status === 'queued').length,
    alreadyQueued: results.filter((result) => result.status === 'already_queued').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'error').length,
    results,
  };

  return NextResponse.json(response);
}
