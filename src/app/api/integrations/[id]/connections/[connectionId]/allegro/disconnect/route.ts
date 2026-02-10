export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  const { id, connectionId: connId } = params;
  if (!id || !connId) {
    throw badRequestError('Integration id and connection id are required.');
  }

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(id);

  if (integration?.slug !== 'allegro') {
    throw notFoundError('Allegro integration not found.', {
      integrationId: id
    });
  }

  await repo.updateConnection(connId, {
    allegroAccessToken: null,
    allegroRefreshToken: null,
    allegroTokenType: null,
    allegroScope: null,
    allegroExpiresAt: null,
    allegroTokenUpdatedAt: null
  });

  return NextResponse.json({ ok: true });
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(
  POST_handler,
  { source: 'integrations.[id].connections.[connectionId].allegro.disconnect.POST', requireCsrf: false }
);
