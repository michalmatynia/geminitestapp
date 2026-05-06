import 'server-only';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import { configurationError, validationError } from '@/shared/errors/app-error';
import {
  GOOGLE_OPENID_EMAIL_PROFILE_SCOPE,
  refreshGoogleOAuthToken,
  readGoogleOAuthAccessToken,
  resolveGoogleOAuthScopes,
} from '@/shared/lib/oauth/google-oauth';
import { decryptSecret, encryptSecret } from '@/shared/lib/security/encryption';

import { getIntegrationRepository } from './integration-repository';

const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

export type IntegrationGoogleOAuthCredential = {
  accessToken: string;
  connectionId: string;
  integrationId: string;
  expiresAt: string | null;
  scope: string | null;
  refreshed: boolean;
};

const decryptStoredSecret = (value: string | null | undefined, label: string): string => {
  const encrypted = value?.trim() ?? '';
  if (encrypted.length === 0) {
    throw configurationError(`${label} is not connected for this integration connection.`);
  }
  const decrypted = decryptSecret(encrypted).trim();
  if (decrypted.length === 0) {
    throw configurationError(`${label} is empty after decryption.`);
  }
  return decrypted;
};

const parseExpiresAtMs = (value: string | Date | null | undefined): number | null => {
  if (value instanceof Date) return value.getTime();
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasUsableCachedAccessToken = (connection: IntegrationConnectionRecord): boolean => {
  const token = connection.googleAccessToken?.trim() ?? '';
  if (token.length === 0) return false;
  const expiresAtMs = parseExpiresAtMs(connection.googleExpiresAt);
  if (expiresAtMs === null) return (connection.googleRefreshToken?.trim() ?? '').length === 0;
  return expiresAtMs - ACCESS_TOKEN_EXPIRY_SKEW_MS > Date.now();
};

const toCredential = (
  connection: IntegrationConnectionRecord,
  accessToken: string,
  refreshed: boolean
): IntegrationGoogleOAuthCredential => ({
  accessToken,
  connectionId: connection.id,
  integrationId: connection.integrationId,
  expiresAt:
    connection.googleExpiresAt instanceof Date
      ? connection.googleExpiresAt.toISOString()
      : connection.googleExpiresAt ?? null,
  scope: connection.googleScope ?? null,
  refreshed,
});

const resolveRefreshedExpiresAt = (expiresIn: number | undefined): Date | null =>
  typeof expiresIn === 'number' ? new Date(Date.now() + expiresIn * 1000) : null;

const splitStoredScopes = (scope: string | null | undefined): string[] => {
  const normalized = scope?.trim() ?? '';
  return normalized.length > 0
    ? normalized.split(/\s+/).filter((value) => value.length > 0)
    : GOOGLE_OPENID_EMAIL_PROFILE_SCOPE.split(/\s+/);
};

const refreshStoredGoogleToken = async (
  connection: IntegrationConnectionRecord
): Promise<IntegrationGoogleOAuthCredential> => {
  const refreshToken = decryptStoredSecret(connection.googleRefreshToken, 'Google refresh token');
  const token = await refreshGoogleOAuthToken({
    refreshToken,
    config: { serviceLabel: 'Google integrations' },
  });
  const accessToken = readGoogleOAuthAccessToken(token);
  const expiresAt = resolveRefreshedExpiresAt(token.expires_in);
  const googleScope = resolveGoogleOAuthScopes(
    token,
    splitStoredScopes(connection.googleScope)
  ).join(' ');

  await getIntegrationRepository().updateConnection(connection.id, {
    googleAccessToken: encryptSecret(accessToken),
    googleTokenType: token.token_type ?? connection.googleTokenType ?? null,
    googleScope,
    googleExpiresAt: expiresAt,
    googleTokenUpdatedAt: new Date(),
  });

  return {
    accessToken,
    connectionId: connection.id,
    integrationId: connection.integrationId,
    expiresAt: expiresAt?.toISOString() ?? null,
    scope: googleScope,
    refreshed: true,
  };
};

export const resolveIntegrationGoogleOAuthCredential = async (
  connectionId: string
): Promise<IntegrationGoogleOAuthCredential> => {
  const normalizedConnectionId = connectionId.trim();
  if (normalizedConnectionId.length === 0) {
    throw validationError('Integration connection id is required.');
  }

  const connection = await getIntegrationRepository().getConnectionById(normalizedConnectionId);
  if (connection === null) {
    throw validationError(`Integration connection ${normalizedConnectionId} was not found.`);
  }

  if (hasUsableCachedAccessToken(connection)) {
    return toCredential(
      connection,
      decryptStoredSecret(connection.googleAccessToken, 'Google access token'),
      false
    );
  }

  return refreshStoredGoogleToken(connection);
};
