import 'server-only';

import { randomBytes } from 'crypto';

import type { OAuthTokenResponseDto } from '@/shared/contracts/integrations/oauth';
import { configurationError, validationError } from '@/shared/errors/app-error';
import { AUTH_SECRET_SETTINGS_KEYS } from '@/shared/lib/settings/secret-setting-keys';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';

export const GOOGLE_OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_MAIL_SCOPE = 'https://mail.google.com/';
export const GOOGLE_OPENID_EMAIL_PROFILE_SCOPE = 'openid email profile';

const DEFAULT_GOOGLE_CLIENT_ID_ENV_KEY = 'GOOGLE_CLIENT_ID';
const DEFAULT_GOOGLE_CLIENT_SECRET_ENV_KEY = 'GOOGLE_CLIENT_SECRET';
const DEFAULT_GOOGLE_CLIENT_ID_SETTING_KEY = AUTH_SECRET_SETTINGS_KEYS.googleClientId;
const DEFAULT_GOOGLE_CLIENT_SECRET_SETTING_KEY = AUTH_SECRET_SETTINGS_KEYS.googleClientSecret;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

export type GoogleOAuthConfigInput = {
  clientId?: string | null;
  clientSecret?: string | null;
  clientIdEnvKey?: string;
  clientSecretEnvKey?: string;
  clientIdSettingKey?: string | null;
  clientSecretSettingKey?: string | null;
  serviceLabel?: string;
};

export type GoogleOAuthAuthorizationUrlInput = {
  config: GoogleOAuthConfig;
  redirectUri: string;
  scopes: readonly string[] | string;
  state: string;
  loginHint?: string | null;
  accessType?: 'offline' | 'online';
  prompt?: string | null;
  includeGrantedScopes?: boolean;
};

export type GoogleOAuthCallbackInput = {
  code: string;
  state: string;
};

export type GoogleOAuthTokenResponse = OAuthTokenResponseDto;

export type GoogleOAuthAccessCredential = {
  accessToken: string;
};

type GoogleOAuthTokenRequestInput = {
  config?: GoogleOAuthConfigInput;
  redirectUri: string;
  code: string;
};

type GoogleOAuthRefreshInput = {
  config?: GoogleOAuthConfigInput;
  refreshToken: string;
};

const normalizeOptionalSecret = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const isConfiguredGoogleOAuthSecret = (
  value: string | null | undefined
): value is string => {
  const normalized = normalizeOptionalSecret(value);
  return normalized !== null && !normalized.startsWith('your_');
};

const resolveGoogleOAuthConfigFromValues = (input: {
  clientId: string | null | undefined;
  clientSecret: string | null | undefined;
}): GoogleOAuthConfig | null => {
  if (!isConfiguredGoogleOAuthSecret(input.clientId)) return null;
  if (!isConfiguredGoogleOAuthSecret(input.clientSecret)) return null;
  return {
    clientId: input.clientId.trim(),
    clientSecret: input.clientSecret.trim(),
  };
};

const readGoogleOAuthEnvironmentConfig = (
  input: GoogleOAuthConfigInput
): GoogleOAuthConfig | null => {
  const clientIdEnvKey = input.clientIdEnvKey ?? DEFAULT_GOOGLE_CLIENT_ID_ENV_KEY;
  const clientSecretEnvKey = input.clientSecretEnvKey ?? DEFAULT_GOOGLE_CLIENT_SECRET_ENV_KEY;
  return resolveGoogleOAuthConfigFromValues({
    clientId: process.env[clientIdEnvKey],
    clientSecret: process.env[clientSecretEnvKey],
  });
};

const readGoogleOAuthSettingsConfig = async (
  input: GoogleOAuthConfigInput
): Promise<GoogleOAuthConfig | null> => {
  const clientIdKey =
    input.clientIdSettingKey === null
      ? null
      : input.clientIdSettingKey ?? DEFAULT_GOOGLE_CLIENT_ID_SETTING_KEY;
  const clientSecretKey =
    input.clientSecretSettingKey === null
      ? null
      : input.clientSecretSettingKey ?? DEFAULT_GOOGLE_CLIENT_SECRET_SETTING_KEY;
  if (clientIdKey === null || clientSecretKey === null) return null;
  const values = await readSecretSettingValues([clientIdKey, clientSecretKey]);
  return resolveGoogleOAuthConfigFromValues({
    clientId: values[clientIdKey],
    clientSecret: values[clientSecretKey],
  });
};

export const readGoogleOAuthConfig = async (
  input: GoogleOAuthConfigInput = {}
): Promise<GoogleOAuthConfig> => {
  const explicitConfig = resolveGoogleOAuthConfigFromValues(input);
  const envConfig = explicitConfig ?? readGoogleOAuthEnvironmentConfig(input);
  const config = envConfig ?? (await readGoogleOAuthSettingsConfig(input));
  if (config !== null) return config;
  const normalizedServiceLabel = input.serviceLabel?.trim() ?? '';
  const serviceLabel = normalizedServiceLabel.length > 0 ? normalizedServiceLabel : 'Google';
  throw configurationError(`${serviceLabel} OAuth client credentials are not configured.`);
};

export const buildGoogleOAuthRedirectUri = (
  request: Request,
  input: { path: string; envKey?: string }
): string => {
  const configured = process.env[input.envKey ?? 'GOOGLE_OAUTH_REDIRECT_URI']?.trim();
  if (configured !== undefined && configured.length > 0) return configured;
  return new URL(input.path, request.url).toString();
};

export const createGoogleOAuthState = (): string => randomBytes(24).toString('base64url');

const normalizeGoogleOAuthScopes = (scopes: readonly string[] | string): string => {
  const entries = typeof scopes === 'string' ? scopes.split(/\s+/) : scopes;
  const normalized = entries.map((scope) => scope.trim()).filter((scope) => scope.length > 0);
  if (normalized.length === 0) {
    throw validationError('At least one Google OAuth scope is required.');
  }
  return normalized.join(' ');
};

export const buildGoogleOAuthAuthorizationUrl = (
  input: GoogleOAuthAuthorizationUrlInput
): string => {
  const url = new URL(GOOGLE_OAUTH_AUTH_URL);
  url.searchParams.set('client_id', input.config.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', normalizeGoogleOAuthScopes(input.scopes));
  url.searchParams.set('access_type', input.accessType ?? 'offline');
  url.searchParams.set('state', input.state);
  if (input.prompt !== null) url.searchParams.set('prompt', input.prompt ?? 'consent');
  if (input.includeGrantedScopes !== false) url.searchParams.set('include_granted_scopes', 'true');
  const loginHint = normalizeOptionalSecret(input.loginHint);
  if (loginHint !== null) url.searchParams.set('login_hint', loginHint);
  return url.toString();
};

const readGoogleOAuthTokenPayload = async (
  response: Response
): Promise<GoogleOAuthTokenResponse> => {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) {
    return (await response.json().catch(() => ({}))) as GoogleOAuthTokenResponse;
  }
  return {
    error_description: await response.text().catch(() => 'Google OAuth token exchange failed.'),
  };
};

const assertGoogleTokenResponseOk = (
  response: Response,
  payload: GoogleOAuthTokenResponse
): void => {
  const tokenError = typeof payload.error === 'string' ? payload.error : '';
  if (response.ok && tokenError.length === 0) return;
  const description =
    typeof payload.error_description === 'string' &&
    payload.error_description.trim().length > 0
      ? payload.error_description
      : null;
  const fallback = tokenError.length > 0 ? tokenError : 'Google OAuth token exchange failed.';
  throw validationError(description ?? fallback);
};

const requestGoogleOAuthToken = async (
  params: URLSearchParams
): Promise<GoogleOAuthTokenResponse> => {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const payload = await readGoogleOAuthTokenPayload(response);
  assertGoogleTokenResponseOk(response, payload);
  return payload;
};

export const exchangeGoogleOAuthAuthorizationCode = async (
  input: GoogleOAuthTokenRequestInput
): Promise<GoogleOAuthTokenResponse> => {
  const config = await readGoogleOAuthConfig(input.config);
  return requestGoogleOAuthToken(
    new URLSearchParams({
      code: input.code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
    })
  );
};

export const readGoogleOAuthAccessToken = (token: GoogleOAuthTokenResponse): string => {
  if (typeof token.access_token !== 'string' || token.access_token.trim().length === 0) {
    throw configurationError('Google did not return an access token.');
  }
  return token.access_token;
};

export const readGoogleOAuthRefreshToken = (token: GoogleOAuthTokenResponse): string => {
  if (typeof token.refresh_token !== 'string' || token.refresh_token.trim().length === 0) {
    throw validationError('Google did not return a refresh token. Reconnect and approve access.');
  }
  return token.refresh_token;
};

export const refreshGoogleOAuthToken = async (
  input: GoogleOAuthRefreshInput
): Promise<GoogleOAuthTokenResponse> => {
  const config = await readGoogleOAuthConfig(input.config);
  return requestGoogleOAuthToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: 'refresh_token',
    })
  );
};

export const refreshGoogleOAuthAccessToken = async (
  input: GoogleOAuthRefreshInput
): Promise<string> => readGoogleOAuthAccessToken(await refreshGoogleOAuthToken(input));

export const resolveGoogleOAuthScopes = (
  token: GoogleOAuthTokenResponse,
  fallbackScopes: readonly string[]
): string[] => {
  const scope = typeof token.scope === 'string' ? token.scope.trim() : '';
  return scope.length > 0 ? scope.split(/\s+/).filter(Boolean) : [...fallbackScopes];
};

const assertNoGoogleCallbackError = (url: URL): void => {
  const error = url.searchParams.get('error');
  if (error !== null && error.trim().length > 0) {
    throw validationError(`Google OAuth failed: ${error}`);
  }
};

const readRequiredCallbackParam = (url: URL, key: 'code' | 'state'): string => {
  const value = url.searchParams.get(key)?.trim() ?? '';
  if (value.length === 0) {
    throw validationError(`Google OAuth callback was missing ${key}.`);
  }
  return value;
};

export const readGoogleOAuthCallbackInput = (request: Request): GoogleOAuthCallbackInput => {
  const url = new URL(request.url);
  assertNoGoogleCallbackError(url);
  return {
    code: readRequiredCallbackParam(url, 'code'),
    state: readRequiredCallbackParam(url, 'state'),
  };
};
