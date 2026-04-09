import { NextRequest, NextResponse } from 'next/server';

import { assertTraderaBrowserSessionReady } from '@/app/api/v2/integrations/_shared/tradera-browser-session-preflight';
import {
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  buildQueuedTraderaStatusCheckMarketplaceData,
  isTraderaStatusCheckPending,
} from '@/features/integrations/utils/tradera-status-check';
import {
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import { productListingSyncPayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingSyncResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

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

  if (isTraderaStatusCheckPending(resolved.listing)) {
    const response: ProductListingSyncResponse = {
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    };
    return NextResponse.json(response);
  }

  await assertTraderaBrowserSessionReady({
    integrationRepository,
    integrationId: resolved.listing.integrationId,
    connectionId: resolved.listing.connectionId,
  });

  initializeQueues();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'check_status',
    source: 'manual',
    ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
  });
  const enqueuedAt = new Date().toISOString();
  await resolved.repository.updateListing(listingId, {
    marketplaceData: buildQueuedTraderaStatusCheckMarketplaceData({
      existingMarketplaceData: resolved.listing.marketplaceData,
      requestId: jobId,
      queuedAt: enqueuedAt,
      requestedBrowserMode: payload.browserMode,
    }),
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
