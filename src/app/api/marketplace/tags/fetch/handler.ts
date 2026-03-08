import { NextRequest, NextResponse } from 'next/server';

import { fetchBaseTags } from '@/features/integrations/server';
import { getExternalTagRepository } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

type FetchMarketplaceTagsRequest = {
  connectionId: string;
};

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

/**
 * POST /api/marketplace/tags/fetch
 * Fetches tags from Base.com and stores them locally for mapping.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseObjectJsonBody(request, {
    logPrefix: 'marketplace.tags.fetch',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const body = parsed.data as FetchMarketplaceTagsRequest;
  const { connectionId } = body;

  if (!connectionId) {
    throw badRequestError('connectionId is required');
  }

  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found');
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    throw notFoundError('Integration not found');
  }

  const integrationSlug = integration.slug?.toLowerCase();
  if (!integrationSlug || !BASE_MARKETPLACE_SLUGS.has(integrationSlug)) {
    throw badRequestError('Only Base.com connections are supported for tag fetch');
  }

  const tokenResolution = resolveBaseConnectionToken({
    baseApiToken: connection.baseApiToken,
  });
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? 'Base.com API token not configured for this connection'
    );
  }

  const tags = await fetchBaseTags(tokenResolution.token, {
    inventoryId: connection.baseLastInventoryId ?? null,
  });

  if (tags.length === 0) {
    return NextResponse.json({
      fetched: 0,
      total: 0,
      message:
        'No tags found in Base.com. Verify tag/label records exist in the selected inventory.',
    });
  }

  const externalTagRepo = getExternalTagRepository();
  const syncedCount = await externalTagRepo.syncFromBase(connectionId, tags);

  return NextResponse.json({
    fetched: syncedCount,
    total: tags.length,
    message: `Successfully synced ${syncedCount} tags from Base.com`,
  });
}
