import { NextRequest, NextResponse } from 'next/server';

import { getExternalCategoryRepository, getIntegrationRepository } from '@/features/integrations/server';
import { marketplaceConnectionRequestSchema } from '@/shared/contracts/integrations/marketplace';
import { type MarketplaceConnectionRequest } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { internalError, isAppError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  buildEmptyMarketplaceCategoryFetchResponse,
  buildMarketplaceCategoryFetchResponse,
  fetchMarketplaceCategories,
  requireMarketplaceConnectionId,
  resolveMarketplaceCategoryFetchContext,
} from './handler.helpers';

/**
 * POST /api/marketplace/categories/fetch
 * Fetches marketplace categories and stores them locally.
 * Base.com uses the API, Tradera uses the live browser listing page scrape.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(request, marketplaceConnectionRequestSchema, {
    logPrefix: 'marketplace.categories.fetch',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body: MarketplaceConnectionRequest = parsed.data;
  const connectionId = requireMarketplaceConnectionId(body);

  const integrationRepo = await getIntegrationRepository();
  const context = await resolveMarketplaceCategoryFetchContext(integrationRepo, connectionId);
  const categories = await fetchMarketplaceCategories(context).catch((error: unknown) => {
    if (isAppError(error)) {
      throw error;
    }

    throw internalError('Marketplace categories fetch failed unexpectedly.', {
      connectionId,
      sourceName: context.sourceName,
      phase: 'fetch',
    }).withCause(error);
  });

  if (categories.length === 0) {
    return NextResponse.json(buildEmptyMarketplaceCategoryFetchResponse(context.sourceName));
  }

  const externalCategoryRepo = getExternalCategoryRepository();
  const syncedCount = await externalCategoryRepo.syncFromBase(connectionId, categories).catch(
    (error: unknown) => {
      if (isAppError(error)) {
        throw error;
      }

      throw internalError('Marketplace categories sync failed unexpectedly.', {
        connectionId,
        sourceName: context.sourceName,
        phase: 'sync',
        fetchedCount: categories.length,
        sampleExternalIds: categories.slice(0, 5).map((category) => category.id),
      }).withCause(error);
    }
  );

  return NextResponse.json(
    buildMarketplaceCategoryFetchResponse(context.sourceName, syncedCount, categories.length)
  );
}
