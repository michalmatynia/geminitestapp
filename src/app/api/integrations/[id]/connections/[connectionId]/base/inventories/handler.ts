import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { fetchBaseInventories } from '@/features/integrations/server';
import { resolveBaseConnectionToken } from '@/features/integrations/services/base-token-resolver';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

/**
 * GET /api/integrations/[id]/connections/[connectionId]/base/inventories
 * Fetches available inventories from Base.com/Baselinker API.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const { id, connectionId } = params;
  if (!id || !connectionId) {
    throw badRequestError('Integration id and connection id are required');
  }

  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    throw notFoundError('Connection not found', { connectionId, integrationId: id });
  }

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    throw notFoundError('Integration not found', { integrationId: id });
  }

  if (integration.slug !== 'baselinker') {
    throw badRequestError('This endpoint is for Base.com/Baselinker connections only.');
  }

  const tokenResolution = resolveBaseConnectionToken(connection);
  if (!tokenResolution.token) {
    throw badRequestError(
      tokenResolution.error ?? 'No Base API token configured. Please test the connection first.'
    );
  }

  const inventories = await fetchBaseInventories(tokenResolution.token);

  return NextResponse.json({
    inventories: inventories.map((inv) => ({ id: inv.id, name: inv.name })),
    count: inventories.length,
    lastInventoryId: connection.baseLastInventoryId,
  });
}
