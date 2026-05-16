import { type NextRequest, NextResponse } from 'next/server';

import { encryptSecret, getIntegrationRepository } from '@/features/integrations/server';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { mapErrorToAppError } from '@/shared/errors/error-mapper';
import {
  GOOGLE_OPENID_EMAIL_PROFILE_SCOPE,
  exchangeGoogleOAuthAuthorizationCode,
  readGoogleOAuthAccessToken,
  readGoogleOAuthCallbackInput,
  readGoogleOAuthRefreshToken,
  resolveGoogleOAuthScopes,
} from '@/shared/lib/oauth/google-oauth';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const GOOGLE_INTEGRATION_COOKIE_PREFIX = 'integrations_google_oauth_state_';
const GOOGLE_INTEGRATION_LOG_SOURCE = 'integrations.google.callback.GET';

type GoogleIntegrationState = {
  nonce: string;
  integrationId: string;
  connectionId: string;
  redirectUri: string;
  scope: string;
};

type CookieDeleter = {
  delete: (name: string) => void;
};

type GoogleCallbackContext = {
  integrationId: string | null;
  connectionId: string | null;
  startedAt: number;
};

const toAdminRedirect = (
  request: NextRequest,
  params: Record<string, string>
): NextResponse => {
  const url = new URL('/admin/integrations', request.url);
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim().length > 0) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url.toString());
};

const isStateRecord = (
  value: unknown
): value is Omit<GoogleIntegrationState, 'scope'> & Partial<Pick<GoogleIntegrationState, 'scope'>> => {
  if (value === null || typeof value !== 'object') return false;
  const record = value as Partial<GoogleIntegrationState>;
  return (
    typeof record.nonce === 'string' &&
    typeof record.integrationId === 'string' &&
    typeof record.connectionId === 'string' &&
    typeof record.redirectUri === 'string'
  );
};

const resolveStateScope = (scope: string | undefined): string => {
  const normalized = scope?.trim() ?? '';
  return normalized.length > 0 ? normalized : GOOGLE_OPENID_EMAIL_PROFILE_SCOPE;
};

const parseState = (raw: string): GoogleIntegrationState | null => {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as unknown;
    if (!isStateRecord(parsed)) return null;
    return {
      nonce: parsed.nonce,
      integrationId: parsed.integrationId,
      connectionId: parsed.connectionId,
      redirectUri: parsed.redirectUri,
      scope: resolveStateScope(parsed.scope),
    };
  } catch {
    return null;
  }
};

const resolveExpiresAt = (expiresIn: number | undefined): Date | null =>
  typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn * 1000) : null;

const splitScopes = (scope: string): string[] =>
  scope.split(/\s+/).map((item) => item.trim()).filter((item) => item.length > 0);

const assertStateNonce = (req: NextRequest, state: GoogleIntegrationState): void => {
  const expectedNonce = req.cookies.get(
    `${GOOGLE_INTEGRATION_COOKIE_PREFIX}${state.connectionId}`
  )?.value;
  if (expectedNonce !== state.nonce) {
    throw badRequestError('Invalid Google OAuth state.');
  }
};

const loadConnectionForState = async (
  state: GoogleIntegrationState
): Promise<IntegrationConnectionRecord> => {
  const repo = getIntegrationRepository();
  const integration = await repo.getIntegrationById(state.integrationId);
  if (integration === null) {
    throw notFoundError('Integration not found.', { integrationId: state.integrationId });
  }
  const connection = await repo.getConnectionByIdAndIntegration(
    state.connectionId,
    state.integrationId
  );
  if (connection === null) {
    throw notFoundError('Connection not found.', {
      integrationId: state.integrationId,
      connectionId: state.connectionId,
    });
  }
  return connection;
};

const resolveRefreshToken = (token: { refresh_token?: string }): string | null =>
  typeof token.refresh_token === 'string' && token.refresh_token.trim().length > 0
    ? readGoogleOAuthRefreshToken(token)
    : null;

const persistGoogleTokens = async (
  state: GoogleIntegrationState,
  code: string,
  connection: IntegrationConnectionRecord
): Promise<void> => {
  const repo = getIntegrationRepository();
  const token = await exchangeGoogleOAuthAuthorizationCode({
    code,
    redirectUri: state.redirectUri,
    config: { serviceLabel: 'Google integrations' },
  });
  const refreshToken = resolveRefreshToken(token);
  await repo.updateConnection(state.connectionId, {
    googleAccessToken: encryptSecret(readGoogleOAuthAccessToken(token)),
    googleRefreshToken: refreshToken !== null
      ? encryptSecret(refreshToken)
      : connection.googleRefreshToken ?? null,
    googleTokenType: token.token_type ?? null,
    googleScope: resolveGoogleOAuthScopes(token, splitScopes(state.scope)).join(' '),
    googleExpiresAt: resolveExpiresAt(token.expires_in),
    googleTokenUpdatedAt: new Date(),
  });
};

const clearOAuthStateCookie = (response: NextResponse, connectionId: string): void => {
  const cookies = (response as unknown as { cookies?: CookieDeleter }).cookies;
  if (cookies === undefined || typeof cookies.delete !== 'function') return;
  cookies.delete(`${GOOGLE_INTEGRATION_COOKIE_PREFIX}${connectionId}`);
};

const logCallbackSuccess = (req: NextRequest, context: GoogleCallbackContext): void => {
  void logSystemEvent({
    level: 'info',
    message: 'Google OAuth callback succeeded',
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      durationMs: Date.now() - context.startedAt,
    },
  });
};

const logCallbackError = (
  req: NextRequest,
  error: unknown,
  context: GoogleCallbackContext
): string => {
  void ErrorSystem.captureException(error, {
    service: 'integrations.google',
    action: 'callback',
    integrationId: context.integrationId,
    connectionId: context.connectionId,
    durationMs: Date.now() - context.startedAt,
  });
  const mapped = mapErrorToAppError(error, 'Google OAuth callback failed.');
  const message = mapped?.message ?? 'Google OAuth callback failed';
  void logSystemEvent({
    level: mapped?.expected === true ? 'warn' : 'error',
    message,
    source: GOOGLE_INTEGRATION_LOG_SOURCE,
    error,
    request: req,
    context: {
      integrationId: context.integrationId,
      connectionId: context.connectionId,
      durationMs: Date.now() - context.startedAt,
    },
  });
  return message;
};

export async function getHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const context: GoogleCallbackContext = {
    integrationId: null,
    connectionId: null,
    startedAt: Date.now(),
  };

  try {
    const input = readGoogleOAuthCallbackInput(req);
    const state = parseState(input.state);
    if (state === null) throw badRequestError('Invalid Google OAuth state.');
    context.integrationId = state.integrationId;
    context.connectionId = state.connectionId;
    assertStateNonce(req, state);

    const connection = await loadConnectionForState(state);
    await persistGoogleTokens(state, input.code, connection);
    const response = toAdminRedirect(req, {
      google: 'connected',
      integrationId: state.integrationId,
      connectionId: state.connectionId,
    });
    clearOAuthStateCookie(response, state.connectionId);
    logCallbackSuccess(req, context);

    return response;
  } catch (error) {
    const message = logCallbackError(req, error, context);
    return toAdminRedirect(req, {
      google: 'error',
      reason: message,
    });
  }
}
