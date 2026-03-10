import { NextRequest, NextResponse } from 'next/server';

import { fetchBaseCategories } from '@/features/integrations/server';
import { fetchTraderaCategoriesForConnection } from '@/features/integrations/server';
import { getExternalCategoryRepository } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import {
  marketplaceConnectionRequestSchema,
  type MarketplaceConnectionRequest,
  type MarketplaceFetchResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);
const TRADERA_MARKETPLACE_SLUGS = new Set(['tradera']);

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
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
    const tokenResolution = resolveBaseConnectionToken({
      baseApiToken: connection.baseApiToken,
    });
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
    throw badRequestError(`${integration.name} is not yet supported for category fetch`);
  }

  if (categories.length === 0) {
    const response: MarketplaceFetchResponse = {
      fetched: 0,
      total: 0,
      message: `No categories found in ${sourceName}.`,
    };

    return NextResponse.json(response);
  }

  // Sync categories to local database
  const externalCategoryRepo = getExternalCategoryRepository();
  const syncedCount = await externalCategoryRepo.syncFromBase(connectionId, categories);

  const response: MarketplaceFetchResponse = {
    fetched: syncedCount,
    total: categories.length,
    message: `Successfully synced ${syncedCount} categories from ${sourceName}`,
  };

  return NextResponse.json(response);
}
