import { type NextRequest, NextResponse } from 'next/server';

import { getExternalCategoryRepository, getIntegrationRepository } from '@/features/integrations/server';
import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import { marketplaceConnectionRequestSchema } from '@/shared/contracts/integrations/marketplace';
import { type MarketplaceConnectionRequest } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { internalError, isAppError, unprocessableEntityError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import {
  buildMarketplaceCategoryStats,
  buildEmptyMarketplaceCategoryFetchResponse,
  buildMarketplaceCategoryFetchResponse,
  fetchMarketplaceCategories,
  requireMarketplaceConnectionId,
  resolveMarketplaceCategoryFetchContext,
} from './handler.helpers';

const shouldRejectShallowTraderaPublicSync = ({
  existingTotal,
  existingMaxDepth,
  existingWithParentCount,
  fetchedTotal,
  fetchedMaxDepth,
  fetchedWithParentCount,
}: {
  existingTotal: number;
  existingMaxDepth: number;
  existingWithParentCount: number;
  fetchedTotal: number;
  fetchedMaxDepth: number;
  fetchedWithParentCount: number;
}): boolean =>
  existingTotal > 0 &&
  existingMaxDepth >= 2 &&
  fetchedMaxDepth <= 1 &&
  fetchedMaxDepth < existingMaxDepth &&
  (fetchedTotal < existingTotal || fetchedWithParentCount < existingWithParentCount);

/**
 * POST /api/marketplace/categories/fetch
 * Fetches marketplace categories and stores them locally.
 * Base.com uses the API.
 * Browser Tradera defaults to the authenticated listing form picker, while explicit
 * Tradera fetch-method overrides can still use the public taxonomy pages.
 */
export async function postHandler(
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
  const context = await resolveMarketplaceCategoryFetchContext(
    integrationRepo,
    connectionId,
    body.categoryFetchMethod
  );
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
    return NextResponse.json(buildEmptyMarketplaceCategoryFetchResponse(context.responseSourceName));
  }

  const categoriesWithFetchMetadata = categories.map((category) => ({
    ...category,
    metadata: {
      ...(category.metadata ?? {}),
      categoryFetchSource: context.responseSourceName,
    },
  }));

  const externalCategoryRepo = getExternalCategoryRepository();
  const fetchedCategoryStats = buildMarketplaceCategoryStats(categoriesWithFetchMetadata);

  if (context.mode === 'tradera') {
    const existingCategories = await externalCategoryRepo.listByConnection(connectionId);

    if (existingCategories.length > 0) {
      const existingCategoryStats = buildMarketplaceCategoryStats(
        existingCategories.map((category: ExternalCategory) => ({
          id: category.externalId,
          name: category.name,
          parentId: category.parentExternalId,
          metadata: category.metadata ?? undefined,
        }))
      );

      if (context.mode === 'tradera') {
        const shallowFetchRecoveryMessage = context.supportsListingForm
          ? 'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept. Retry the fetch using Listing form picker.'
          : 'Tradera public taxonomy pages returned a shallower category tree than the categories already stored. Existing categories were kept. Public taxonomy pages are currently the only available Tradera category source for this integration.';
        if (
          shouldRejectShallowTraderaPublicSync({
            existingTotal: existingCategories.length,
            existingMaxDepth: existingCategoryStats.maxDepth,
            existingWithParentCount: existingCategoryStats.withParentCount,
            fetchedTotal: categoriesWithFetchMetadata.length,
            fetchedMaxDepth: fetchedCategoryStats.maxDepth,
            fetchedWithParentCount: fetchedCategoryStats.withParentCount,
          })
        ) {
          throw unprocessableEntityError(
            shallowFetchRecoveryMessage,
            {
              connectionId,
              sourceName: context.responseSourceName,
              existingTotal: existingCategories.length,
              existingMaxDepth: existingCategoryStats.maxDepth,
              fetchedTotal: categoriesWithFetchMetadata.length,
              fetchedMaxDepth: fetchedCategoryStats.maxDepth,
            }
          );
        }
      }
    }
  }

  const syncedCount = await externalCategoryRepo
    .syncFromBase(connectionId, categoriesWithFetchMetadata)
    .catch(
    (error: unknown) => {
      if (isAppError(error)) {
        throw error;
      }

      throw internalError('Marketplace categories sync failed unexpectedly.', {
        connectionId,
        sourceName: context.sourceName,
        phase: 'sync',
        fetchedCount: categoriesWithFetchMetadata.length,
        sampleExternalIds: categoriesWithFetchMetadata.slice(0, 5).map((category) => category.id),
      }).withCause(error);
    }
  );

  return NextResponse.json(
    buildMarketplaceCategoryFetchResponse(
      context.responseSourceName,
      syncedCount,
      categories.length,
      fetchedCategoryStats
    )
  );
}
