/**
 * Auth Secret Settings
 * 
 * Secret settings management for authentication providers.
 * Provides:
 * - OAuth provider credentials (Google, Facebook)
 * - Email webhook configuration
 * - Secret settings key definitions
 * - Secure credential retrieval
 * - Server-only secret access
 */

import 'server-only';

import { AUTH_SECRET_SETTINGS_KEYS } from '@/shared/lib/settings/secret-setting-keys';
import { readSecretSettingValues } from '@/shared/lib/settings/secret-settings';

export { AUTH_SECRET_SETTINGS_KEYS };

export type AuthOAuthSecrets = {
  google: {
    clientId: string | null;
    clientSecret: string | null;
  };
  facebook: {
    clientId: string | null;
    clientSecret: string | null;
  };
};

export type AuthEmailSecrets = {
  webhookUrl: string | null;
  webhookSecret: string | null;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  } | null;
};

const parsePort = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getAuthOAuthSecrets = async (): Promise<AuthOAuthSecrets> => {
  const values = await readSecretSettingValues([
    AUTH_SECRET_SETTINGS_KEYS.googleClientId,
    AUTH_SECRET_SETTINGS_KEYS.googleClientSecret,
    AUTH_SECRET_SETTINGS_KEYS.facebookClientId,
    AUTH_SECRET_SETTINGS_KEYS.facebookClientSecret,
  ]);

  return {
    google: {
      clientId: values[AUTH_SECRET_SETTINGS_KEYS.googleClientId] ?? null,
      clientSecret: values[AUTH_SECRET_SETTINGS_KEYS.googleClientSecret] ?? null,
    },
    facebook: {
      clientId: values[AUTH_SECRET_SETTINGS_KEYS.facebookClientId] ?? null,
      clientSecret: values[AUTH_SECRET_SETTINGS_KEYS.facebookClientSecret] ?? null,
    },
  };
};

export const getAuthEmailSecrets = async (): Promise<AuthEmailSecrets> => {
  const values = await readSecretSettingValues([
    AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl,
    AUTH_SECRET_SETTINGS_KEYS.emailWebhookSecret,
    AUTH_SECRET_SETTINGS_KEYS.smtpHost,
    AUTH_SECRET_SETTINGS_KEYS.smtpPort,
    AUTH_SECRET_SETTINGS_KEYS.smtpUser,
    AUTH_SECRET_SETTINGS_KEYS.smtpPass,
    AUTH_SECRET_SETTINGS_KEYS.smtpFrom,
  ]);

  const webhookUrl = values[AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl] ?? null;
  const webhookSecret = values[AUTH_SECRET_SETTINGS_KEYS.emailWebhookSecret] ?? null;
  const smtpHost = values[AUTH_SECRET_SETTINGS_KEYS.smtpHost] ?? null;
  const smtpPort = values[AUTH_SECRET_SETTINGS_KEYS.smtpPort] ?? null;
  const smtpUser = values[AUTH_SECRET_SETTINGS_KEYS.smtpUser] ?? null;
  const smtpPass = values[AUTH_SECRET_SETTINGS_KEYS.smtpPass] ?? null;
  const smtpFrom = values[AUTH_SECRET_SETTINGS_KEYS.smtpFrom] ?? null;

  const smtp =
    smtpHost && smtpUser && smtpPass
      ? {
        host: smtpHost,
        port: parsePort(smtpPort, 587),
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom ?? smtpUser,
      }
      : null;

  return {
    webhookUrl,
    webhookSecret,
    smtp,
  };
};
