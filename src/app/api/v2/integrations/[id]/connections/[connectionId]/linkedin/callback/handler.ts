import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getIntegrationRepository } from '@/features/integrations/server';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const TOKEN_URL =
  process.env['LINKEDIN_TOKEN_URL'] ?? 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE_URL = process.env['LINKEDIN_API_BASE_URL'] ?? 'https://api.linkedin.com/v2';
const DEFAULT_SCOPE = process.env['LINKEDIN_OAUTH_SCOPE'] ?? 'r_liteprofile w_member_social';

type LinkedInTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

type LinkedInProfileResponse = {
  id?: string;
  vanityName?: string;
};

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

const fetchLinkedInProfile = async (
  accessToken: string
): Promise<LinkedInProfileResponse | null> => {
  const profileRes = await fetch(
    `${API_BASE_URL}/me?projection=(id,vanityName)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!profileRes.ok) return null;
  return (await profileRes.json()) as LinkedInProfileResponse;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  let integrationId: string | null = null;
  let connectionId: string | null = null;
  const requestUrl = new URL(req.url);
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;

  try {
    const { id, connectionId: connId } = params;
    integrationId = id;
    connectionId = connId;

    const errorParam = query.error ?? null;
    if (errorParam) {
      const description = query.error_description ?? errorParam;
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, description));
    }

    const code = query.code ?? null;
    const state = query.state ?? null;
    if (!code || !state) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Missing authorization code.')
      );
    }

    const expectedState = req.cookies.get(`linkedin_oauth_state_${connId}`)?.value;
    if (!expectedState || expectedState !== state) {
      return NextResponse.redirect(toErrorRedirect(requestUrl.origin, 'Invalid OAuth state.'));
    }

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (integration?.['slug'] !== 'linkedin') {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'LinkedIn integration not found.')
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(connId, id);

    if (!connection?.username || !connection.password) {
      return NextResponse.redirect(
        toErrorRedirect(requestUrl.origin, 'Missing LinkedIn credentials.')
      );
    }

    const clientId = connection.username;
    const clientSecret = decryptSecret(connection.password);
    const redirectUri = `${requestUrl.origin}/api/v2/integrations/${id}/connections/${connId}/linkedin/callback`;

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    let payload: LinkedInTokenResponse;
    const contentType = tokenRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = (await tokenRes.json()) as LinkedInTokenResponse;
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

    const profile = await fetchLinkedInProfile(payload.access_token);
    const personUrn = profile?.id ? `urn:li:person:${profile.id}` : null;
    const profileUrl = profile?.vanityName
      ? `https://www.linkedin.com/in/${profile.vanityName}`
      : null;

    await repo.updateConnection(connId, {
      linkedinAccessToken: encryptSecret(payload.access_token),
      linkedinRefreshToken: payload.refresh_token ? encryptSecret(payload.refresh_token) : null,
      linkedinTokenType: payload.token_type ?? null,
      linkedinScope: payload.scope ?? DEFAULT_SCOPE ?? null,
      linkedinExpiresAt: expiresAt ? expiresAt.toISOString() : null,
      linkedinTokenUpdatedAt: new Date().toISOString(),
      linkedinPersonUrn: personUrn,
      linkedinProfileUrl: profileUrl,
    });

    const successUrl = new URL('/admin/integrations', requestUrl.origin);
    successUrl.searchParams.set('linkedin', 'connected');

    const response = NextResponse.redirect(successUrl.toString());
    if (response.cookies?.set) {
      response.cookies.set({
        name: `linkedin_oauth_state_${connId}`,
        value: '',
        maxAge: 0,
        path: '/',
      });
    }

    return response;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const mapped = mapErrorToAppError(error, 'LinkedIn authorization failed.');
    const message = mapped?.message ?? 'LinkedIn OAuth callback failed';
    void logSystemEvent({
      level: mapped?.expected ? 'warn' : 'error',
      message,
      source: 'integrations.[id].connections.[connectionId].linkedin.callback.GET',
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
