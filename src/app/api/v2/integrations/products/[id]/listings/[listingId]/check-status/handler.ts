import { NextRequest, NextResponse } from 'next/server';

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
import { productListingSyncPayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingSyncResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

export async function POST_handler(
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
    throw badRequestError('Invalid check-status payload');
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
    throw badRequestError('Live status check is only supported for Tradera browser listings');
  }

  const normalizedStatus = (resolved.listing.status ?? '').trim().toLowerCase();
  if (normalizedStatus === 'running' || normalizedStatus === 'queued') {
    const response: ProductListingSyncResponse = {
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    };
    return NextResponse.json(response);
  }

  initializeQueues();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'check_status',
    source: 'manual',
    ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
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
          action: 'check_status',
          requestedBrowserMode: payload.browserMode ?? 'connection_default',
          requestId: jobId,
          queuedAt: enqueuedAt,
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
