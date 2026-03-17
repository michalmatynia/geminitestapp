import 'server-only';

import { readSecretSettingValue } from '@/shared/lib/settings/secret-settings';

export const AUTH_SECRET_SETTINGS_KEYS = {
  googleClientId: 'auth_google_client_id',
  googleClientSecret: 'auth_google_client_secret',
  facebookClientId: 'auth_facebook_client_id',
  facebookClientSecret: 'auth_facebook_client_secret',
  emailWebhookUrl: 'auth_email_webhook_url',
  emailWebhookSecret: 'auth_email_webhook_secret',
  smtpHost: 'auth_smtp_host',
  smtpPort: 'auth_smtp_port',
  smtpUser: 'auth_smtp_user',
  smtpPass: 'auth_smtp_pass',
  smtpFrom: 'auth_smtp_from',
} as const;

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
  const [googleClientId, googleClientSecret, facebookClientId, facebookClientSecret] =
    await Promise.all([
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.googleClientId),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.googleClientSecret),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.facebookClientId),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.facebookClientSecret),
    ]);

  return {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    },
    facebook: {
      clientId: facebookClientId,
      clientSecret: facebookClientSecret,
    },
  };
};

export const getAuthEmailSecrets = async (): Promise<AuthEmailSecrets> => {
  const [webhookUrl, webhookSecret, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom] =
    await Promise.all([
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.emailWebhookUrl),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.emailWebhookSecret),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.smtpHost),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.smtpPort),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.smtpUser),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.smtpPass),
      readSecretSettingValue(AUTH_SECRET_SETTINGS_KEYS.smtpFrom),
    ]);

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
