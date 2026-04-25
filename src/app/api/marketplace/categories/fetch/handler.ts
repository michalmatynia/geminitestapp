import { type NextRequest, NextResponse } from 'next/server';

import { getExternalCategoryRepository, getIntegrationRepository } from '@/features/integrations/server';
import type { BaseCategory, ExternalCategory } from '@/shared/contracts/integrations/listings';
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
  type MarketplaceCategoryFetchContext,
  requireMarketplaceConnectionId,
  resolveMarketplaceCategoryFetchContext,
} from './handler.helpers';

const shouldRejectShallowTraderaCategorySync = ({
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
}): boolean => {
  if (existingTotal === 0 || fetchedMaxDepth >= existingMaxDepth) {
    return false;
  }

  const lostMeaningfulDepth =
    (existingMaxDepth >= 2 && fetchedMaxDepth <= 1) ||
    (existingMaxDepth >= 3 && fetchedMaxDepth <= 2);
  if (!lostMeaningfulDepth) return false;

  return (
    fetchedTotal < existingTotal || fetchedWithParentCount < existingWithParentCount
  );
};

const shouldProtectExistingTraderaCategoryDepth = (
  context: MarketplaceCategoryFetchContext
): boolean => context.mode === 'tradera-listing-form';

const buildShallowTraderaFetchRecoveryMessage = (): string =>
  'Tradera listing form picker returned a shallower category tree than the categories already stored. Existing categories were kept. Ensure the connection session is authenticated, then retry category fetch.';

const addCategoryFetchMetadata = (
  categories: BaseCategory[],
  sourceName: string
): BaseCategory[] =>
  categories.map((category) => ({
    ...category,
    metadata: {
      ...(category.metadata ?? {}),
      categoryFetchSource: sourceName,
    },
  }));

const mapStoredExternalCategoriesToBaseCategories = (
  categories: ExternalCategory[]
): BaseCategory[] =>
  categories.map((category) => ({
    id: category.externalId,
    name: category.name,
    parentId: category.parentExternalId,
    metadata: category.metadata ?? undefined,
  }));

type ExternalCategoryRepo = ReturnType<typeof getExternalCategoryRepository>;

const assertTraderaFetchDoesNotDowngradeStoredDepth = async ({
  categories,
  categoryStats,
  connectionId,
  context,
  externalCategoryRepo,
}: {
  categories: BaseCategory[];
  categoryStats: ReturnType<typeof buildMarketplaceCategoryStats>;
  connectionId: string;
  context: MarketplaceCategoryFetchContext;
  externalCategoryRepo: ExternalCategoryRepo;
}): Promise<void> => {
  if (!shouldProtectExistingTraderaCategoryDepth(context)) return;

  const existingCategories = await externalCategoryRepo.listByConnection(connectionId);
  if (existingCategories.length === 0) return;

  const existingCategoryStats = buildMarketplaceCategoryStats(
    mapStoredExternalCategoriesToBaseCategories(existingCategories)
  );
  if (
    !shouldRejectShallowTraderaCategorySync({
      existingTotal: existingCategories.length,
      existingMaxDepth: existingCategoryStats.maxDepth,
      existingWithParentCount: existingCategoryStats.withParentCount,
      fetchedTotal: categories.length,
      fetchedMaxDepth: categoryStats.maxDepth,
      fetchedWithParentCount: categoryStats.withParentCount,
    })
  ) {
    return;
  }

  throw unprocessableEntityError(
    buildShallowTraderaFetchRecoveryMessage(),
    {
      connectionId,
      sourceName: context.responseSourceName,
      existingTotal: existingCategories.length,
      existingMaxDepth: existingCategoryStats.maxDepth,
      fetchedTotal: categories.length,
      fetchedMaxDepth: categoryStats.maxDepth,
    }
  );
};

const fetchMarketplaceCategoriesWithContext = async (
  context: MarketplaceCategoryFetchContext,
  connectionId: string
): Promise<BaseCategory[]> =>
  fetchMarketplaceCategories(context).catch((error: unknown) => {
    if (isAppError(error)) {
      throw error;
    }

    throw internalError('Marketplace categories fetch failed unexpectedly.', {
      connectionId,
      sourceName: context.sourceName,
      phase: 'fetch',
    }).withCause(error);
  });

const syncMarketplaceCategories = async ({
  categories,
  connectionId,
  context,
  externalCategoryRepo,
}: {
  categories: BaseCategory[];
  connectionId: string;
  context: MarketplaceCategoryFetchContext;
  externalCategoryRepo: ExternalCategoryRepo;
}): Promise<number> =>
  externalCategoryRepo.syncFromBase(connectionId, categories).catch((error: unknown) => {
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
  });

/**
 * POST /api/marketplace/categories/fetch
 * Fetches marketplace categories and stores them locally.
 * Base.com uses the API.
 * Browser Tradera uses the authenticated listing form picker.
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

  const integrationRepo = getIntegrationRepository();
  const context = await resolveMarketplaceCategoryFetchContext(
    integrationRepo,
    connectionId,
    body.browserMode
  );
  const categories = await fetchMarketplaceCategoriesWithContext(context, connectionId);

  if (categories.length === 0) {
    return NextResponse.json(buildEmptyMarketplaceCategoryFetchResponse(context.responseSourceName));
  }

  const categoriesWithFetchMetadata = addCategoryFetchMetadata(
    categories,
    context.responseSourceName
  );
  const externalCategoryRepo = getExternalCategoryRepository();
  const fetchedCategoryStats = buildMarketplaceCategoryStats(categoriesWithFetchMetadata);

  await assertTraderaFetchDoesNotDowngradeStoredDepth({
    categories: categoriesWithFetchMetadata,
    categoryStats: fetchedCategoryStats,
    connectionId,
    context,
    externalCategoryRepo,
  });

  const syncedCount = await syncMarketplaceCategories({
    categories: categoriesWithFetchMetadata,
    connectionId,
    context,
    externalCategoryRepo,
  });

  return NextResponse.json(
    buildMarketplaceCategoryFetchResponse(
      context.responseSourceName,
      syncedCount,
      categories.length,
      fetchedCategoryStats
    )
  );
}
