import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const AUTH_URL =
  process.env['LINKEDIN_AUTH_URL'] ?? 'https://www.linkedin.com/oauth/v2/authorization';
const DEFAULT_SCOPE = process.env['LINKEDIN_OAUTH_SCOPE'] ?? 'openid profile w_member_social';
const ENV_CLIENT_ID = process.env['LINKEDIN_APP_KEY_SECRET']?.trim() ?? null;
const ENV_CLIENT_SECRET = process.env['LINKEDIN_APP_CLIENT_SECRET']?.trim() ?? null;

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const startedAt = Date.now();
  let integrationId: string | null = null;
  let connectionId: string | null = null;

  try {
    const { id, connectionId: connId } = params;
    integrationId = id;
    connectionId = connId;
    if (!id || !connId) {
      throw badRequestError('Integration id and connection id are required.');
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);

    if (integration?.['slug'] !== 'linkedin') {
      throw notFoundError('LinkedIn integration not found.', { integrationId: id });
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection) {
      throw notFoundError('Connection not found.', {
        connectionId: connId,
        integrationId: id,
      });
    }

    const connectionClientId = connection.username?.trim() ?? null;
    const connectionSecret = connection.password?.trim() ?? null;
    const hasConnectionCredentials = Boolean(connectionClientId && connectionSecret);
    const clientId = hasConnectionCredentials ? connectionClientId : ENV_CLIENT_ID;
    const clientSecret = hasConnectionCredentials ? connectionSecret : ENV_CLIENT_SECRET;

    if (!clientId) {
      throw badRequestError(
        'LinkedIn client ID is required. Provide it in the connection or LINKEDIN_APP_KEY_SECRET.',
        { connectionId: connId }
      );
    }

    if (!clientSecret) {
      throw badRequestError(
        'LinkedIn client secret is required. Provide it in the connection or LINKEDIN_APP_CLIENT_SECRET.',
        { connectionId: connId }
      );
    }

    const nonce = randomUUID();
    const callbackUrl = new URL(req.url);
    const redirectUri = `${callbackUrl.origin}/api/v2/integrations/linkedin/callback`;

    const statePayload = JSON.stringify({ nonce, integrationId: id, connectionId: connId });
    const state = Buffer.from(statePayload).toString('base64url');

    const url = new URL(AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', DEFAULT_SCOPE);

    const response = NextResponse.redirect(url.toString());
    if (response.cookies?.set) {
      response.cookies.set({
        name: `linkedin_oauth_state_${connId}`,
        value: nonce,
        httpOnly: true,
        sameSite: 'lax',
        secure: callbackUrl.protocol === 'https:',
        maxAge: 600,
        path: '/',
      });
    }

    void logSystemEvent({
      level: 'info',
      message: 'LinkedIn OAuth authorize initiated',
      source: 'integrations.[id].connections.[connectionId].linkedin.authorize.GET',
      request: req,
      context: {
        integrationId,
        connectionId,
        durationMs: Date.now() - startedAt,
        scope: DEFAULT_SCOPE,
        redirectHost: callbackUrl.host,
      },
    });

    return response;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'integrations.linkedin',
      action: 'authorize',
      integrationId,
      connectionId,
      durationMs: Date.now() - startedAt,
    });
    const mapped = mapErrorToAppError(error, 'LinkedIn authorization failed.');
    const message = mapped?.message ?? 'LinkedIn OAuth authorize failed';
    void logSystemEvent({
      level: mapped?.expected ? 'warn' : 'error',
      message,
      source: 'integrations.[id].connections.[connectionId].linkedin.authorize.GET',
      error,
      request: req,
      context: {
        integrationId,
        connectionId,
        durationMs: Date.now() - startedAt,
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
    throw error;
  }
}
