import { NextRequest, NextResponse } from 'next/server';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import { enqueueTraderaListingJob } from '@/features/jobs/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }

  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (resolved?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { productId, listingId });
  }

  const integrationRepository = await getIntegrationRepository();
  const integration = await integrationRepository.getIntegrationById(
    resolved.listing.integrationId
  );
  if (!isTraderaIntegrationSlug(integration?.slug)) {
    throw badRequestError('Relist is only supported for Tradera listings');
  }

  const normalizedStatus = (resolved.listing.status ?? '').trim().toLowerCase();
  if (
    normalizedStatus === 'running' ||
    normalizedStatus === 'queued_relist' ||
    normalizedStatus === 'queued'
  ) {
    return NextResponse.json({
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    });
  }

  await resolved.repository.updateListingStatus(listingId, 'queued_relist');
  await resolved.repository.updateListing(listingId, {
    nextRelistAt: null,
    failureReason: null,
    lastStatusCheckAt: new Date().toISOString(),
  });

  const enqueuedAt = new Date().toISOString();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'relist',
    source: 'manual',
  });

  return NextResponse.json({
    queued: true,
    listingId,
    queue: {
      name: 'tradera-listings',
      jobId,
      enqueuedAt,
    },
  });
}
