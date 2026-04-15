import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/features/integrations/server';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import type { LinkedInProfileResponseDto, OAuthTokenResponseDto } from '@/shared/contracts/integrations/oauth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const TOKEN_URL =
  process.env['LINKEDIN_TOKEN_URL'] ?? 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE_URL = process.env['LINKEDIN_API_BASE_URL'] ?? 'https://api.linkedin.com/v2';
const DEFAULT_SCOPE = process.env['LINKEDIN_OAUTH_SCOPE'] ?? 'openid profile w_member_social';
const ENV_CLIENT_ID = process.env['LINKEDIN_APP_KEY_SECRET']?.trim() ?? null;
const ENV_CLIENT_SECRET = process.env['LINKEDIN_APP_CLIENT_SECRET']?.trim() ?? null;

type StatePayload = {
  nonce: string;
  integrationId: string;
  connectionId: string;
};

const parseStateRecord = (raw: string): Record<string, unknown> | null => {
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf-8');
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const resolveStateField = (
  record: Record<string, unknown>,
  key: keyof StatePayload,
): string | null => (typeof record[key] === 'string' ? record[key] : null);

const toErrorRedirect = (origin: string, reason: string): string => {
  const url = new URL('/admin/integrations', origin);
  url.searchParams.set('linkedin', 'error');
  url.searchParams.set('reason', reason);
  return url.toString();
};

export const querySchema = z.object({
  error: optionalTrimmedQueryString(),
  error_description: optionalTrimmedQueryString(),
  code: optionalTrimmedQueryString(),
  state: optionalTrimmedQueryString(),
});

const parseState = (raw: string): StatePayload | null => {
  const record = parseStateRecord(raw);
  if (!record) {
    return null;
  }

  const nonce = resolveStateField(record, 'nonce');
  const integrationId = resolveStateField(record, 'integrationId');
  const connectionId = resolveStateField(record, 'connectionId');

  return nonce === null || integrationId === null || connectionId === null
    ? null
    : { nonce, integrationId, connectionId };
};

const fetchLinkedInProfile = async (
  accessToken: string
): Promise<LinkedInProfileResponseDto | null> => {
  const profileRes = await fetch(`${API_BASE_URL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!profileRes.ok) return null;
  return (await profileRes.json()) as LinkedInProfileResponseDto;
};

const LOG_SOURCE = 'integrations.linkedin.callback.GET';

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const startedAt = Date.now();
  let stage: 'init' | 'validate' | 'exchange' | 'profile' | 'update' | 'redirect' = 'init';
  let integrationId: string | null = null;
  let connectionId: string | null = null;
  let tokenStatus: number | null = null;
  let tokenContentType: string | null = null;
  let tokenError: string | null = null;
  let expiresIn: number | null = null;
  let resolvedScope: string | null = null;
  let hasRefreshToken = false;
  let profileResolved = false;
  let profileHasVanity = false;
  const requestUrl = new URL(req.url);

  try {
    stage = 'validate';
    const query = querySchema.parse(_ctx.query ?? {});

    const errorParam = query.error ?? null;
    if (errorParam) {
      const description = query.error_description ?? errorParam;
      void logSystemEvent({
        level: 'warn',
        message: 'LinkedIn OAuth callback returned an error',
        source: LOG_SOURCE,
        request: req,
        context: { error: errorParam, description, durationMs: Date.now() - startedAt },
      });
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, description));
    }

    const code = query.code ?? null;
    const stateRaw = query.state ?? null;
    if (!code || !stateRaw) {
      void logSystemEvent({
        level: 'warn',
        message: 'LinkedIn OAuth callback missing parameters',
        source: LOG_SOURCE,
        request: req,
        context: { hasCode: Boolean(code), hasState: Boolean(stateRaw), durationMs: Date.now() - startedAt },
      });
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, 'Missing authorization code.'));
    }

    const statePayload = parseState(stateRaw);
    if (!statePayload) {
      throw badRequestError('Invalid OAuth state format.');
    }

    integrationId = statePayload.integrationId;
    connectionId = statePayload.connectionId;

    const expectedNonce = req.cookies.get(`linkedin_oauth_state_${connectionId}`)?.value;
    if (!expectedNonce || expectedNonce !== statePayload.nonce) {
      void logSystemEvent({
        level: 'warn',
        message: 'LinkedIn OAuth callback state mismatch',
        source: LOG_SOURCE,
        request: req,
        context: {
          integrationId,
          connectionId,
          hasExpectedState: Boolean(expectedNonce),
          durationMs: Date.now() - startedAt,
        },
      });
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, 'Invalid OAuth state.'));
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(integrationId);
    if (integration?.['slug'] !== 'linkedin') {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'LinkedIn integration not found.')
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(connectionId, integrationId);

    const connectionClientId = connection?.username?.trim() ?? null;
    const connectionSecretEncrypted = connection?.password?.trim() ?? null;
    const hasConnectionCredentials = Boolean(connectionClientId && connectionSecretEncrypted);
    const clientId = hasConnectionCredentials ? connectionClientId : ENV_CLIENT_ID;
    const clientSecret = hasConnectionCredentials
      ? decryptSecret(connectionSecretEncrypted ?? '')
      : ENV_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Missing LinkedIn credentials.')
      );
    }

    const redirectUri = `${requestUrl.origin}/api/v2/integrations/linkedin/callback`;

    stage = 'exchange';
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    let payload: OAuthTokenResponseDto;
    tokenContentType = tokenRes.headers.get('content-type') || '';
    tokenStatus = tokenRes.status;
    if (tokenContentType.includes('application/json')) {
      payload = (await tokenRes.json()) as OAuthTokenResponseDto;
    } else {
      payload = { error_description: await tokenRes.text() };
    }
    tokenError = payload.error_description || payload.error || null;
    expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : null;
    resolvedScope = payload.scope ?? DEFAULT_SCOPE ?? null;
    hasRefreshToken = Boolean(payload.refresh_token);

    if (!tokenRes.ok || payload.error || !payload.access_token) {
      const reason = tokenError || 'Token exchange failed.';
      void logSystemEvent({
        level: 'warn',
        message: 'LinkedIn OAuth token exchange failed',
        source: LOG_SOURCE,
        request: req,
        context: { integrationId, connectionId, tokenStatus, tokenError, durationMs: Date.now() - startedAt },
      });
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, reason));
    }

    const expiresAt =
      typeof payload.expires_in === 'number'
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null;

    stage = 'profile';
    const profile = await fetchLinkedInProfile(payload.access_token);
    profileResolved = Boolean(profile?.sub);
    profileHasVanity = Boolean(profile?.name);
    const personUrn = profile?.sub ? `urn:li:person:${profile.sub}` : null;
    const profileUrl = profile?.name
      ? `https://www.linkedin.com/in/${encodeURIComponent(profile.name)}`
      : null;

    stage = 'update';
    await repo.updateConnection(connectionId, {
      linkedinAccessToken: encryptSecret(payload.access_token),
      linkedinRefreshToken: payload.refresh_token ? encryptSecret(payload.refresh_token) : null,
      linkedinTokenType: payload.token_type ?? null,
      linkedinScope: resolvedScope,
      linkedinExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      linkedinTokenUpdatedAt: new Date().toISOString(),
      linkedinPersonUrn: personUrn,
      linkedinProfileUrl: profileUrl,
    });

    stage = 'redirect';
    const successUrl = new URL('/admin/integrations', requestUrl.origin);
    successUrl.searchParams.set('linkedin', 'connected');

    const response = NextResponse.redirect(successUrl.toString());
    if (response.cookies?.set) {
      response.cookies.set({
        name: `linkedin_oauth_state_${connectionId}`,
        value: '',
        maxAge: 0,
        path: '/',
      });
    }

    void logSystemEvent({
      level: 'info',
      message: 'LinkedIn OAuth callback succeeded',
      source: LOG_SOURCE,
      request: req,
      context: {
        integrationId,
        connectionId,
        tokenStatus,
        expiresIn,
        scope: resolvedScope,
        hasRefreshToken,
        profileResolved,
        profileHasVanity,
        durationMs: Date.now() - startedAt,
      },
    });

    return response;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'integrations.linkedin',
      action: 'oauthCallback',
      stage,
      integrationId,
      connectionId,
      tokenStatus,
      tokenContentType,
      tokenError,
      durationMs: Date.now() - startedAt,
    });
    const mapped = mapErrorToAppError(error, 'LinkedIn authorization failed.');
    const message = mapped?.message ?? 'LinkedIn OAuth callback failed';
    void logSystemEvent({
      level: mapped?.expected ? 'warn' : 'error',
      message,
      source: LOG_SOURCE,
      error,
      request: req,
      context: {
        integrationId,
        connectionId,
        stage,
        tokenStatus,
        tokenError,
        durationMs: Date.now() - startedAt,
      },
    });
    return NextResponse.redirect(toErrorRedirect(requestUrl.origin, message));
  }
}
