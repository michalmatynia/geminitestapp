import { NextRequest, NextResponse } from 'next/server';

import { fetchBaseProducers } from '@/features/integrations/server';
import { getExternalProducerRepository } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

type FetchMarketplaceProducersRequest = {
  connectionId: string;
};

const BASE_MARKETPLACE_SLUGS = new Set(['baselinker', 'base', 'base-com']);

/**
 * POST /api/marketplace/producers/fetch
 * Fetches producers from Base.com and stores them locally for mapping.
 */
export async function POST_handler(
  request: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const body = (await request.json()) as FetchMarketplaceProducersRequest;
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
    throw badRequestError('Only Base.com connections are supported for producer fetch');
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? 'Base.com API token not configured for this connection'
    );
  }

  const producers = await fetchBaseProducers(tokenResolution.token, {
    inventoryId: connection.baseLastInventoryId ?? null,
  });

  if (producers.length === 0) {
    return NextResponse.json({
      fetched: 0,
      total: 0,
      message:
        'No producers found in Base.com. Verify producer/manufacturer records exist in the selected inventory.',
    });
  }

  const externalProducerRepo = getExternalProducerRepository();
  const syncedCount = await externalProducerRepo.syncFromBase(connectionId, producers);

  return NextResponse.json({
    fetched: syncedCount,
    total: producers.length,
    message: `Successfully synced ${syncedCount} producers from Base.com`,
  });
}
