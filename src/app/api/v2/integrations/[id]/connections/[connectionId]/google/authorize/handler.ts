import { randomUUID } from 'crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import {
  GOOGLE_OPENID_EMAIL_PROFILE_SCOPE,
  buildGoogleOAuthAuthorizationUrl,
  buildGoogleOAuthRedirectUri,
  readGoogleOAuthConfig,
} from '@/shared/lib/oauth/google-oauth';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const GOOGLE_INTEGRATION_COOKIE_PREFIX = 'integrations_google_oauth_state_';
const GOOGLE_INTEGRATION_LOG_SOURCE =
  'integrations.[id].connections.[connectionId].google.authorize.GET';
const GOOGLE_INTEGRATION_CALLBACK_PATH = '/api/v2/integrations/google/callback';

type CookieSetter = {
  set: (options: {
    name: string;
    value: string;
    httpOnly: boolean;
    sameSite: 'lax';
    secure: boolean;
    maxAge: number;
    path: string;
  }) => void;
};

type GoogleAuthorizeContext = {
  integrationId: string | null;
  connectionId: string | null;
  startedAt: number;
};

const normalizeScope = (value: string | null): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : GOOGLE_OPENID_EMAIL_PROFILE_SCOPE;
};

const setOAuthStateCookie = (
  response: NextResponse,
  request: NextRequest,
  connectionId: string,
  nonce: string
): void => {
  const cookies = (response as unknown as { cookies?: CookieSetter }).cookies;
  if (cookies === undefined || typeof cookies.set !== 'function') return;
  cookies.set({
    name: `${GOOGLE_INTEGRATION_COOKIE_PREFIX}${connectionId}`,
    value: nonce,
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 600,
    path: '/',
  });
};

const assertRouteParams = (params: { id: string; connectionId: string }): void => {
  if (params.id.length === 0 || params.connectionId.length === 0) {
    throw badRequestError('Integration id and connection id are required.');
  }
};

const loadConnection = async (
  integrationId: string,
  connectionId: string
): Promise<IntegrationConnectionRecord> => {
  const repo = getIntegrationRepository();
  const integration = await repo.getIntegrationById(integrationId);
  if (integration === null) {
    throw notFoundError('Integration not found.', { integrationId });
  }
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, integrationId);
  if (connection === null) {
    throw notFoundError('Connection not found.', { integrationId, connectionId });
  }
  return connection;
};

const buildState = (input: {
  nonce: string;
  integrationId: string;
  connectionId: string;
  redirectUri: string;
  scope: string;
}): string => Buffer.from(JSON.stringify(input)).toString('base64url');

const logAuthorizeSuccess = (
  req: NextRequest,
  context: GoogleAuthorizeContext & { scope: string }
): void => {
  void logSystemEvent({
    level: 'info',
    message: 'Google OAuth authorize initiated',
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      scope: context.scope,
      durationMs: Date.now() - context.startedAt,
    },
  });
};

const logAuthorizeError = (
  req: NextRequest,
  error: unknown,
  context: GoogleAuthorizeContext
): void => {
  void ErrorSystem.captureException(error, {
    service: 'integrations.google',
    action: 'authorize',
    integrationId: context.integrationId,
    connectionId: context.connectionId,
    durationMs: Date.now() - context.startedAt,
  });
  const mapped = mapErrorToAppError(error, 'Google authorization failed.');
  void logSystemEvent({
    level: mapped?.expected === true ? 'warn' : 'error',
    message: mapped?.message ?? 'Google OAuth authorize failed',
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    error,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      durationMs: Date.now() - context.startedAt,
    },
  });
};

export async function getHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  const context: GoogleAuthorizeContext = {
    integrationId: params.id,
    connectionId: params.connectionId,
    startedAt: Date.now(),
  };

  try {
    assertRouteParams(params);
    const connection = await loadConnection(params.id, params.connectionId);

    const config = await readGoogleOAuthConfig({ serviceLabel: 'Google integrations' });
    const scope = normalizeScope(req.nextUrl.searchParams.get('scope'));
    const redirectUri = buildGoogleOAuthRedirectUri(req, {
      envKey: 'GOOGLE_INTEGRATIONS_OAUTH_REDIRECT_URI',
      path: GOOGLE_INTEGRATION_CALLBACK_PATH,
    });
    const nonce = randomUUID();
    const state = buildState({
      nonce,
      integrationId: params.id,
      connectionId: params.connectionId,
      redirectUri,
      scope,
    });
    const url = buildGoogleOAuthAuthorizationUrl({
      config,
      redirectUri,
      scopes: scope,
      state,
      loginHint: connection.username ?? null,
    });

    const response = NextResponse.redirect(url);
    setOAuthStateCookie(response, req, params.connectionId, nonce);
    logAuthorizeSuccess(req, { ...context, scope });

    return response;
  } catch (error) {
    logAuthorizeError(req, error, context);
    throw error;
  }
}
