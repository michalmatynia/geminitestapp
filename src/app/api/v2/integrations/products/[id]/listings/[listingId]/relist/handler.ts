import { NextRequest, NextResponse } from 'next/server';

import {
  isPlaywrightProgrammableSlug,
  isTraderaIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import {
  enqueuePlaywrightListingJob,
  enqueueTraderaListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import {
  productListingRelistPayloadSchema,
  type ProductListingRelistResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
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

  const rawBody = await req.json().catch(() => ({}));
  const payloadResult = productListingRelistPayloadSchema.safeParse(rawBody);
  if (!payloadResult.success) {
    throw badRequestError('Invalid relist payload');
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
  if (!isTraderaIntegrationSlug(integrationSlug) && !isPlaywrightProgrammableSlug(integrationSlug)) {
    throw badRequestError('Relist is only supported for Tradera and Playwright (Programmable) listings');
  }
  if (
    payload.browserMode &&
    !isPlaywrightProgrammableSlug(integrationSlug) &&
    !isTraderaBrowserIntegrationSlug(integrationSlug)
  ) {
    throw badRequestError(
      'Browser mode override is only supported for Playwright and Tradera browser relists'
    );
  }

  const normalizedStatus = (resolved.listing.status ?? '').trim().toLowerCase();
  if (
    normalizedStatus === 'running' ||
    normalizedStatus === 'queued_relist' ||
    normalizedStatus === 'queued'
  ) {
    const response: ProductListingRelistResponse = {
      queued: true,
      alreadyQueued: true,
      listingId,
      status: resolved.listing.status,
    };

    return NextResponse.json(response);
  }

  await resolved.repository.updateListingStatus(listingId, 'queued_relist');
  await resolved.repository.updateListing(listingId, {
    nextRelistAt: null,
    failureReason: null,
    lastStatusCheckAt: new Date().toISOString(),
  });

  const enqueuedAt = new Date().toISOString();

  if (isPlaywrightProgrammableSlug(integrationSlug)) {
    initializeQueues();
    const jobId = await enqueuePlaywrightListingJob({
      listingId,
      action: 'relist',
      source: 'manual',
      ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
    });
    const previousMarketplaceData = toRecord(resolved.listing.marketplaceData);
    const previousPlaywrightData = toRecord(previousMarketplaceData['playwright']);
    await resolved.repository.updateListing(listingId, {
      marketplaceData: {
        ...previousMarketplaceData,
        marketplace: 'playwright-programmable',
        playwright: {
          ...previousPlaywrightData,
          pendingExecution: {
            requestedBrowserMode: payload.browserMode ?? 'connection_default',
            requestId: jobId,
            queuedAt: enqueuedAt,
          },
        },
      },
    });
    const response: ProductListingRelistResponse = {
      queued: true,
      listingId,
      queue: {
        name: 'playwright-programmable-listings',
        jobId,
        enqueuedAt,
      },
    };
    return NextResponse.json(response);
  }

  initializeQueues();
  const jobId = await enqueueTraderaListingJob({
    listingId,
    action: 'relist',
    source: 'manual',
    ...(payload.browserMode ? { browserMode: payload.browserMode } : {}),
  });
  const previousMarketplaceData = toRecord(resolved.listing.marketplaceData);
  const previousTraderaData = toRecord(previousMarketplaceData['tradera']);
  await resolved.repository.updateListing(listingId, {
    marketplaceData: {
      ...previousMarketplaceData,
      marketplace: 'tradera',
      tradera: {
        ...previousTraderaData,
        pendingExecution: {
          requestedBrowserMode: payload.browserMode ?? 'connection_default',
          requestId: jobId,
          queuedAt: enqueuedAt,
        },
      },
    },
  });

  const response: ProductListingRelistResponse = {
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
