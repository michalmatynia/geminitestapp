import { NextRequest, NextResponse } from 'next/server';

import { fetchBaseCategories } from '@/features/integrations/server';
import { fetchTraderaCategoriesForConnection } from '@/features/integrations/server';
import { getExternalCategoryRepository } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import type { FetchMarketplaceCategoriesRequest as FetchCategoriesRequest } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera']);

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
 */
export async function POST_handler(request: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await request.json()) as FetchCategoriesRequest;
  const { connectionId } = body;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionById(connectionId);

  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await repo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = (integration.slug || '').toLowerCase();
  if (!integrationSlug) {
    throw badRequestError('Integration slug is missing');
  }

  let categories: Array<{ id: string; name: string; parentId: string | null }>;
  let sourceName: string;

  if (BASE_MARKETPLACE_SLUGS.has(integrationSlug)) {
    const tokenResolution = resolveBaseConnectionToken(connection);
    if (!tokenResolution.token) {
      throw badRequestError(
        tokenResolution.error || 'Base.com API token not configured for this connection'
      );
    }
    categories = await fetchBaseCategories(tokenResolution.token, {
      inventoryId: connection.baseLastInventoryId ?? null,
    });
    sourceName = 'Base.com';
  } else if (TRADERA_MARKETPLACE_SLUGS.has(integrationSlug)) {
    categories = await fetchTraderaCategoriesForConnection(connection);
    sourceName = 'Tradera';
  } else {
    throw badRequestError(
      `${integration.name} is not yet supported for category fetch`
    );
  }

  if (categories.length === 0) {
    return NextResponse.json({
      fetched: 0,
      total: 0,
      message: `No categories found in ${sourceName}.`,
    });
  }

  // Sync categories to local database
  const externalCategoryRepo = getExternalCategoryRepository();
  const syncedCount = await externalCategoryRepo.syncFromBase(connectionId, categories);

  return NextResponse.json({
    fetched: syncedCount,
    total: categories.length,
    message: `Successfully synced ${syncedCount} categories from ${sourceName}`,
  });
}
