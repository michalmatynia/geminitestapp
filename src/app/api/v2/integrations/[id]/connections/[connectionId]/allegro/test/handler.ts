import { NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import type { TestConnectionResponse, TestLogEntry } from '@/shared/contracts/integrations/session-testing';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { configurationError, externalServiceError } from '@/shared/errors/app-error';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const PROD_BASE_URL = process.env['ALLEGRO_API_URL'] ?? 'https://api.allegro.pl';
const SANDBOX_BASE_URL =
  process.env['ALLEGRO_SANDBOX_API_URL'] ?? 'https://api.allegro.pl.allegrosandbox.pl';
const PROD_TOKEN_URL = process.env['ALLEGRO_TOKEN_URL'] ?? 'https://allegro.pl/auth/oauth/token';
const SANDBOX_TOKEN_URL =
  process.env['ALLEGRO_SANDBOX_TOKEN_URL'] ??
  'https://allegro.pl.allegrosandbox.pl/auth/oauth/token';

/**
 * POST /api/v2/integrations/[id]/connections/[connectionId]/allegro/test
 * Tests Allegro API access using stored credentials.
 */
export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const steps: TestLogEntry[] = [];

  const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string): void => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = async (step: string, detail: string, status: number = 400): Promise<Response> => {
    const safeDetail = detail?.trim() ? detail : 'Unknown error';
    pushStep(step, 'failed', safeDetail);

    throw mapStatusToAppError(safeDetail, status);
  };

  const { id, connectionId } = params;
  if (!id || !connectionId) {
    return await fail('Loading connection', 'Integration id and connection id are required', 400);
  }

  pushStep('Loading connection', 'pending', 'Fetching stored credentials');
  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    return await fail('Loading connection', 'Connection not found', 404);
  }
  pushStep('Loading connection', 'ok', 'Connection loaded');

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    return await fail('Loading integration', 'Integration not found', 404);
  }

  if (integration.slug !== 'allegro') {
    return await fail(
      'Connection test',
      `This endpoint is for Allegro connections only. Got: ${integration.name}`,
      400
    );
  }

  if (!connection.allegroAccessToken) {
    return await fail('Token validation', 'Allegro access token not configured. Connect first.');
  }

  const clientId = connection.username?.trim();
  const clientSecret = connection.password ? decryptSecret(connection.password) : null;
  const refreshToken = connection.allegroRefreshToken
    ? decryptSecret(connection.allegroRefreshToken)
    : null;

  const baseUrl = connection.allegroUseSandbox ? SANDBOX_BASE_URL : PROD_BASE_URL;
  const tokenUrl = connection.allegroUseSandbox ? SANDBOX_TOKEN_URL : PROD_TOKEN_URL;

  const buildRequest = (token: string): Promise<Response> =>
    fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.allegro.public.v1+json',
      },
    });

  const refreshAccessToken = async (): Promise<string> => {
    if (!refreshToken || !clientId || !clientSecret) {
      throw configurationError('Missing refresh token or client credentials.');
    }
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!tokenRes.ok) {
      const payload = await tokenRes.text();
      throw externalServiceError(`Failed to refresh Allegro token: ${tokenRes.status} ${payload}`, {
        status: tokenRes.status,
      });
    }
    const payload = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      token_type?: string;
      scope?: string;
      expires_in?: number;
    };
    const expiresAt = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000) : null;
    await repo.updateConnection(connection.id, {
      allegroAccessToken: encryptSecret(payload.access_token),
      allegroRefreshToken: payload.refresh_token
        ? encryptSecret(payload.refresh_token)
        : (connection.allegroRefreshToken ?? null),
      allegroTokenType: payload.token_type ?? null,
      allegroScope: payload.scope ?? null,
      allegroExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      allegroTokenUpdatedAt: new Date().toISOString(),
    });
    return payload.access_token;
  };

  pushStep('Testing API connection', 'pending', 'Calling Allegro /me');
  let accessToken = decryptSecret(connection.allegroAccessToken);
  let apiResponse = await buildRequest(accessToken);
  let refreshed = false;

  if (apiResponse.status === 401 && refreshToken) {
    pushStep('Refreshing token', 'pending', 'Refreshing Allegro access token');
    try {
      accessToken = await refreshAccessToken();
      refreshed = true;
      pushStep('Refreshing token', 'ok', 'Allegro token refreshed');
      apiResponse = await buildRequest(accessToken);
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await fail('Refreshing token', message);
    }
  }

  const raw = await apiResponse.text();
  if (!apiResponse.ok) {
    return await fail(
      'Testing API connection',
      raw || `${apiResponse.status} ${apiResponse.statusText}`.trim(),
      apiResponse.status
    );
  }

  pushStep(
    'Testing API connection',
    'ok',
    refreshed ? 'API connection successful. Token refreshed.' : 'API connection successful.'
  );

  await repo.updateConnection(connection.id, {
    allegroTokenUpdatedAt: new Date().toISOString(),
  });

  let profile: unknown;
  try {
    profile = raw ? (JSON.parse(raw) as unknown) : null;
  } catch (error) {
    void ErrorSystem.captureException(error);
    profile = raw;
  }

  const successResponse: TestConnectionResponse = {
    ok: true,
    steps,
    profile,
  };

  return NextResponse.json(successResponse);
}
