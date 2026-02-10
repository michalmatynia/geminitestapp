export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { decryptSecret } from '@/features/integrations/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

/**
 * GET /api/integrations/connections/[id]/session
 * Returns stored Playwright session cookies for a connection.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id: connectionId } = params;
  if (!connectionId) {
    throw badRequestError('Connection id is required');
  }

  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionById(connectionId);

  if (!connection) {
    throw notFoundError('Connection not found', { connectionId });
  }

  if (!connection.playwrightStorageState) {
    throw notFoundError('No stored Playwright session.', { connectionId });
  }

  const decrypted = decryptSecret(connection.playwrightStorageState);
  const storageState = JSON.parse(decrypted) as {
    cookies?: unknown[];
    origins?: unknown[];
  };

  return NextResponse.json({
    cookies: storageState.cookies ?? [],
    origins: storageState.origins ?? [],
    updatedAt: connection.playwrightStorageStateUpdatedAt
  });
}

export const GET = apiHandlerWithParams<{ id: string }>(
  GET_handler,
  { source: 'integrations.connections.[id].session.GET', requireCsrf: false }
);
