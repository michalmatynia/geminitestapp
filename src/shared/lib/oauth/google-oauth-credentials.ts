import 'server-only';

import type {
  GoogleOAuthCredentialSource,
  GoogleOAuthCredentialsStatus,
  UpdateGoogleOAuthCredentialsInput,
} from '@/shared/contracts/google-oauth-credentials';
import { AUTH_SECRET_SETTINGS_KEYS } from '@/shared/lib/settings/secret-setting-keys';
import {
  deleteSecretSettingValues,
  readSecretSettingValues,
  upsertSecretSettingValue,
} from '@/shared/lib/settings/secret-settings';

import { isConfiguredGoogleOAuthSecret } from './google-oauth';

const GOOGLE_CLIENT_ID_ENV_KEY = 'GOOGLE_CLIENT_ID';
const GOOGLE_CLIENT_SECRET_ENV_KEY = 'GOOGLE_CLIENT_SECRET';
const CLIENT_ID_KEY = AUTH_SECRET_SETTINGS_KEYS.googleClientId;
const CLIENT_SECRET_KEY = AUTH_SECRET_SETTINGS_KEYS.googleClientSecret;

const normalizeCredentialInput = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const maskClientId = (value: string | null): string | null => {
  if (value === null) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}...`;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const resolveSource = (input: {
  environmentConfigured: boolean;
  localConfigured: boolean;
}): GoogleOAuthCredentialSource => {
  if (input.environmentConfigured) return 'environment';
  if (input.localConfigured) return 'local_database';
  return 'none';
};

export const readGoogleOAuthCredentialsStatus =
  async (): Promise<GoogleOAuthCredentialsStatus> => {
    const values = await readSecretSettingValues([CLIENT_ID_KEY, CLIENT_SECRET_KEY]);
    const localClientId = normalizeCredentialInput(values[CLIENT_ID_KEY]);
    const localClientSecret = normalizeCredentialInput(values[CLIENT_SECRET_KEY]);
    const localClientIdConfigured = isConfiguredGoogleOAuthSecret(localClientId);
    const localClientSecretConfigured = isConfiguredGoogleOAuthSecret(localClientSecret);
    const localConfigured = localClientIdConfigured && localClientSecretConfigured;
    const environmentConfigured =
      isConfiguredGoogleOAuthSecret(process.env[GOOGLE_CLIENT_ID_ENV_KEY]) &&
      isConfiguredGoogleOAuthSecret(process.env[GOOGLE_CLIENT_SECRET_ENV_KEY]);

    return {
      configured: environmentConfigured || localConfigured,
      source: resolveSource({ environmentConfigured, localConfigured }),
      environmentConfigured,
      localConfigured,
      localClientIdConfigured,
      localClientSecretConfigured,
      localClientIdPreview: localClientIdConfigured ? maskClientId(localClientId) : null,
    };
  };

export const updateGoogleOAuthCredentials = async (
  input: UpdateGoogleOAuthCredentialsInput
): Promise<GoogleOAuthCredentialsStatus> => {
  const clientId = normalizeCredentialInput(input.clientId);
  const clientSecret = normalizeCredentialInput(input.clientSecret);
  const keysToDelete: string[] = [];

  if (input.clearClientId === true && clientId === null) {
    keysToDelete.push(CLIENT_ID_KEY);
  }
  if (input.clearClientSecret === true && clientSecret === null) {
    keysToDelete.push(CLIENT_SECRET_KEY);
  }

  await Promise.all([
    ...(keysToDelete.length > 0 ? [deleteSecretSettingValues(keysToDelete)] : []),
    ...(clientId !== null ? [upsertSecretSettingValue(CLIENT_ID_KEY, clientId)] : []),
    ...(clientSecret !== null ? [upsertSecretSettingValue(CLIENT_SECRET_KEY, clientSecret)] : []),
  ]);

  return readGoogleOAuthCredentialsStatus();
};
