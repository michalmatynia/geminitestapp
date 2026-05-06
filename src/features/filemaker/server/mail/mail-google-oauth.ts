import 'server-only';

import { configurationError, validationError } from '@/shared/errors/app-error';
import {
  GOOGLE_MAIL_SCOPE,
  buildGoogleOAuthAuthorizationUrl,
  buildGoogleOAuthRedirectUri,
  createGoogleOAuthState,
  exchangeGoogleOAuthAuthorizationCode,
  readGoogleOAuthCallbackInput,
  readGoogleOAuthRefreshToken,
  readGoogleOAuthConfig,
  refreshGoogleOAuthAccessToken,
  resolveGoogleOAuthScopes,
  type GoogleOAuthAccessCredential,
} from '@/shared/lib/oauth/google-oauth';
import {
  deleteSecretSettingValues,
  readSecretSettingValue,
  upsertSecretSettingValue,
} from '@/shared/lib/settings/secret-settings';
import { FILEMAKER_MAIL_GOOGLE_OAUTH_STATE_SETTING_PREFIX } from '@/shared/lib/settings/secret-setting-keys';

import type { FilemakerMailAccount } from '../../types';
import { mailStorage as storage } from '../mail-service/storage';
import {
  buildAccountSecretSettingKey,
  normalizeEmailAddress,
  resolveAccountSecretSettingKey,
} from './mail-utils';

const GOOGLE_MAIL_OAUTH_CALLBACK_PATH = '/api/filemaker/mail/google/oauth/callback';
const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60_000;

type GoogleOAuthState = {
  accountId: string;
  redirectUri: string;
  createdAt: string;
};

export type FilemakerMailOAuthCredential = GoogleOAuthAccessCredential;

const buildStateKey = (state: string): string =>
  `${FILEMAKER_MAIL_GOOGLE_OAUTH_STATE_SETTING_PREFIX}${state}`;

const isGoogleOAuthStatePayload = (value: unknown): value is GoogleOAuthState => {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<GoogleOAuthState>;
  return (
    typeof candidate.accountId === 'string' &&
    typeof candidate.redirectUri === 'string' &&
    typeof candidate.createdAt === 'string'
  );
};

const assertStoredStateFresh = (state: GoogleOAuthState): void => {
  const createdAtMs = Date.parse(state.createdAt);
  if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > GOOGLE_OAUTH_STATE_TTL_MS) {
    throw validationError('Google OAuth state expired. Start the connection again.');
  }
};

const parseStoredStateJson = (raw: string): GoogleOAuthState => {
  const parsed = JSON.parse(raw) as unknown;
  if (!isGoogleOAuthStatePayload(parsed)) {
    throw new Error('invalid state payload');
  }
  return parsed;
};

const parseStoredState = (raw: string | null): GoogleOAuthState => {
  if (raw === null) {
    throw validationError('Google OAuth state was not found. Start the connection again.');
  }
  try {
    const state = parseStoredStateJson(raw);
    assertStoredStateFresh(state);
    return state;
  } catch (error) {
    if (error instanceof Error && error.message.includes('expired')) throw error;
    throw validationError('Google OAuth state was invalid. Start the connection again.');
  }
};

const getOAuthRefreshTokenSettingKey = (accountId: string): string =>
  buildAccountSecretSettingKey(accountId, 'google_oauth_refresh_token');

export const refreshGoogleMailAccessToken = async (
  account: FilemakerMailAccount
): Promise<string> => {
  const refreshTokenKey = account.oauthRefreshTokenSettingKey?.trim() ?? '';
  if (account.authMode !== 'google_oauth' || refreshTokenKey.length === 0) {
    throw configurationError(`Google OAuth is not connected for ${account.emailAddress}.`);
  }

  const refreshToken = await readSecretSettingValue(refreshTokenKey);
  if (refreshToken === null) {
    throw configurationError(`Google OAuth token is missing for ${account.emailAddress}.`);
  }

  return refreshGoogleOAuthAccessToken({ refreshToken, config: { serviceLabel: 'Google mail' } });
};

export const createGoogleMailOAuthAuthorizationUrl = async (
  accountId: string,
  request: Request
): Promise<string> => {
  const account = await storage.getMailAccountById(accountId);
  if (account === null) {
    throw validationError(`Mail account ${accountId} not found.`);
  }

  const config = await readGoogleOAuthConfig({ serviceLabel: 'Google mail' });
  const redirectUri = buildGoogleOAuthRedirectUri(request, {
    envKey: 'GOOGLE_MAIL_OAUTH_REDIRECT_URI',
    path: GOOGLE_MAIL_OAUTH_CALLBACK_PATH,
  });
  const state = createGoogleOAuthState();
  await upsertSecretSettingValue(
    buildStateKey(state),
    JSON.stringify({ accountId, redirectUri, createdAt: new Date().toISOString() })
  );

  return buildGoogleOAuthAuthorizationUrl({
    config,
    redirectUri,
    scopes: [GOOGLE_MAIL_SCOPE],
    state,
    loginHint: normalizeEmailAddress(account.emailAddress),
  });
};

const resolveRefreshTokenKey = (account: FilemakerMailAccount): string => {
  const configuredKey = account.oauthRefreshTokenSettingKey?.trim() ?? '';
  return configuredKey.length > 0 ? configuredKey : getOAuthRefreshTokenSettingKey(account.id);
};

export const completeGoogleMailOAuthCallback = async (
  request: Request
): Promise<{ accountId: string }> => {
  const input = readGoogleOAuthCallbackInput(request);
  const stateKey = buildStateKey(input.state);
  const storedState = parseStoredState(await readSecretSettingValue(stateKey));
  await deleteSecretSettingValues([stateKey]);
  const token = await exchangeGoogleOAuthAuthorizationCode({
    code: input.code,
    redirectUri: storedState.redirectUri,
    config: { serviceLabel: 'Google mail' },
  });
  const refreshToken = readGoogleOAuthRefreshToken(token);

  const account = await storage.getMailAccountById(storedState.accountId);
  if (account === null) {
    throw validationError(`Mail account ${storedState.accountId} not found.`);
  }

  const now = new Date().toISOString();
  const refreshTokenKey = resolveRefreshTokenKey(account);
  await upsertSecretSettingValue(refreshTokenKey, refreshToken);
  await deleteSecretSettingValues([
    resolveAccountSecretSettingKey(account, 'imap_password'),
    resolveAccountSecretSettingKey(account, 'smtp_password'),
  ]);

  await storage.upsertMailAccount({
    ...account,
    updatedAt: now,
    authMode: 'google_oauth',
    oauthProvider: 'google',
    oauthRefreshTokenSettingKey: refreshTokenKey,
    oauthConnectedAt: now,
    oauthScopes: resolveGoogleOAuthScopes(token, [GOOGLE_MAIL_SCOPE]),
    provider: 'imap_smtp',
    status: 'active',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    imapUser: normalizeEmailAddress(account.emailAddress),
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpSecure: true,
    smtpUser: normalizeEmailAddress(account.emailAddress),
    pushEnabled: true,
    lastSyncError: null,
  });

  return { accountId: account.id };
};

export const disconnectGoogleMailOAuth = async (accountId: string): Promise<FilemakerMailAccount> => {
  const account = await storage.getMailAccountById(accountId);
  if (account === null) {
    throw validationError(`Mail account ${accountId} not found.`);
  }
  const refreshTokenKey = account.oauthRefreshTokenSettingKey?.trim() ?? '';
  if (refreshTokenKey.length > 0) {
    await deleteSecretSettingValues([refreshTokenKey]);
  }

  const nextAccount: FilemakerMailAccount = {
    ...account,
    updatedAt: new Date().toISOString(),
    authMode: 'password',
    oauthProvider: null,
    oauthRefreshTokenSettingKey: null,
    oauthConnectedAt: null,
    oauthScopes: [],
    status: 'paused',
    pushEnabled: false,
    lastSyncError: 'Google OAuth disconnected. Add mailbox passwords or reconnect Google.',
  };
  await storage.upsertMailAccount(nextAccount);
  return nextAccount;
};
