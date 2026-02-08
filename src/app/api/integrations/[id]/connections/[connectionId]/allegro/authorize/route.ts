export const runtime = 'nodejs';

import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

const PROD_AUTH_URL =
  process.env['ALLEGRO_AUTH_URL'] ?? 'https://allegro.pl/auth/oauth/authorize';
const SANDBOX_AUTH_URL =
  process.env['ALLEGRO_SANDBOX_AUTH_URL'] ??
  'https://allegro.pl.allegrosandbox.pl/auth/oauth/authorize';

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string; connectionId: string }): Promise<Response> {
  const { id, connectionId: connId } = params;
  if (!id || !connId) {
    throw badRequestError('Integration id and connection id are required.');
  }

  const repo = await getIntegrationRepository();
  const integration = await repo.getIntegrationById(id);

  if (integration?.slug !== 'allegro') {
    throw notFoundError('Allegro integration not found.', { integrationId: id });
  }

  const connection = await repo.getConnectionByIdAndIntegration(connId, id);

  if (!connection) {
    throw notFoundError('Connection not found.', {
      connectionId: connId,
      integrationId: id
    });
  }

  if (!connection.username?.trim()) {
    throw badRequestError('Allegro client ID is required.', {
      connectionId: connId
    });
  }

  const state = randomUUID();
  const callbackUrl = new URL(_req.url);
  const redirectUri = `${callbackUrl.origin}/api/integrations/${id}/connections/${connId}/allegro/callback`;

  const authUrl = connection.allegroUseSandbox ? SANDBOX_AUTH_URL : PROD_AUTH_URL;
  const url = new URL(authUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', connection.username);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set({
    name: `allegro_oauth_state_${connId}`,
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: callbackUrl.protocol === 'https:',
    maxAge: 600,
    path: '/'
  });

  return response;
}

export const GET = apiHandlerWithParams<{ id: string; connectionId: string }>(
  GET_handler,
  { source: 'integrations.[id].connections.[connectionId].allegro.authorize.GET', requireCsrf: false }
);
