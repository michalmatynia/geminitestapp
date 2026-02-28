import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';

const PROD_TOKEN_URL = process.env['ALLEGRO_TOKEN_URL'] ?? 'https://allegro.pl/auth/oauth/token';
const SANDBOX_TOKEN_URL =
  process.env['ALLEGRO_SANDBOX_TOKEN_URL'] ??
  'https://allegro.pl.allegrosandbox.pl/auth/oauth/token';

type AllegroTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

const toErrorRedirect = (origin: string, reason: string): string => {
  const url = new URL('/admin/integrations', origin);
  url.searchParams.set('allegro', 'error');
  url.searchParams.set('reason', reason);
  return url.toString();
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  let integrationId: string | null = null;
  let connectionId: string | null = null;
  const requestUrl = new URL(req.url);

  try {
    const { id, connectionId: connId } = params;
    integrationId = id;
    connectionId = connId;

    const errorParam = requestUrl.searchParams.get('error');
    if (errorParam) {
      const description = requestUrl.searchParams.get('error_description') || errorParam;
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, description));
    }

    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    if (!code || !state) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Missing authorization code.')
      );
    }

    const expectedState = req.cookies.get(`allegro_oauth_state_${connId}`)?.value;
    if (!expectedState || expectedState !== state) {
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, 'Invalid OAuth state.'));
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (integration?.slug !== 'allegro') {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Allegro integration not found.')
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection?.username || !connection.password) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Missing Allegro credentials.')
      );
    }

    const clientId = connection.username;
    const clientSecret = decryptSecret(connection.password);
    const redirectUri = `${requestUrl.origin}/api/integrations/${id}/connections/${connId}/allegro/callback`;

    const tokenUrl = connection.allegroUseSandbox ? SANDBOX_TOKEN_URL : PROD_TOKEN_URL;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    let payload: AllegroTokenResponse;
    const contentType = tokenRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = (await tokenRes.json()) as AllegroTokenResponse;
    } else {
      payload = { error_description: await tokenRes.text() };
    }

    if (!tokenRes.ok || payload.error || !payload.access_token) {
      const reason = payload.error_description || payload.error || 'Token exchange failed.';
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, reason));
    }

    const expiresAt =
      typeof payload.expires_in === 'number'
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null;

    await repo.updateConnection(connId, {
      allegroAccessToken: encryptSecret(payload.access_token),
      allegroRefreshToken: payload.refresh_token ? encryptSecret(payload.refresh_token) : null,
      allegroTokenType: payload.token_type ?? null,
      allegroScope: payload.scope ?? null,
      allegroExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      allegroTokenUpdatedAt: new Date().toISOString(),
    });

    const successUrl = new URL('/admin/integrations', requestUrl.origin);
    successUrl.searchParams.set('allegro', 'connected');

    const response = NextResponse.redirect(successUrl.toString());
    response.cookies.set({
      name: `allegro_oauth_state_${connId}`,
      value: '',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    const mapped = mapErrorToAppError(error, 'Allegro authorization failed.');
    const message = mapped?.message ?? 'Allegro OAuth callback failed';
    void logSystemEvent({
      level: mapped?.expected ? 'warn' : 'error',
      message,
      source: 'integrations.[id].connections.[connectionId].allegro.callback.GET',
      error,
      request: req,
      context: {
        integrationId,
        connectionId,
        ...(mapped
          ? {
              code: mapped.code,
              httpStatus: mapped.httpStatus,
              expected: mapped.expected,
              critical: mapped.critical,
              retryable: mapped.retryable,
            }
          : {}),
      },
    });
    return NextResponse.redirect(toErrorRedirect(requestUrl.origin, message));
  }
}
