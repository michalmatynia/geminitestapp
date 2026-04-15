import { type NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationDisconnectResponse } from '@/shared/contracts/integrations/api';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const { id, connectionId: connId } = params;
  if (!id || !connId) {
    throw badRequestError('Integration id and connection id are required.');
  }

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(id);

  if (integration?.slug !== 'allegro') {
    throw notFoundError('Allegro integration not found.', {
      integrationId: id,
    });
  }

  await repo.updateConnection(connId, {
    allegroAccessToken: null,
    allegroRefreshToken: null,
    allegroTokenType: null,
    allegroScope: null,
    allegroExpiresAt: null,
    allegroTokenUpdatedAt: null,
  });

  const response: IntegrationDisconnectResponse = { ok: true };

  return NextResponse.json(response);
}
