export const SECRET_SETTING_REDACTED_VALUE = '';

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

export const FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS = {
  webhookUrl: 'filemaker_campaign_email_webhook_url',
  webhookSecret: 'filemaker_campaign_email_webhook_secret',
  smtpHost: 'filemaker_campaign_smtp_host',
  smtpPort: 'filemaker_campaign_smtp_port',
  smtpUser: 'filemaker_campaign_smtp_user',
  smtpPass: 'filemaker_campaign_smtp_pass',
  smtpFrom: 'filemaker_campaign_smtp_from',
} as const;

export const FILEMAKER_MAIL_ACCOUNT_SECRET_SETTING_PREFIX = 'filemaker_mail_account_';
export const FILEMAKER_MAIL_GOOGLE_OAUTH_STATE_SETTING_PREFIX =
  'filemaker_mail_google_oauth_state_';

const EXACT_SECRET_SETTING_KEYS = new Set<string>([
  ...Object.values(AUTH_SECRET_SETTINGS_KEYS),
  ...Object.values(FILEMAKER_CAMPAIGN_EMAIL_SECRET_SETTINGS_KEYS),
]);

const SECRET_SETTING_PREFIXES = [
  FILEMAKER_MAIL_ACCOUNT_SECRET_SETTING_PREFIX,
  FILEMAKER_MAIL_GOOGLE_OAUTH_STATE_SETTING_PREFIX,
] as const;

export const isSecretSettingKey = (key: string): boolean => {
  const normalizedKey = key.trim();
  return (
    EXACT_SECRET_SETTING_KEYS.has(normalizedKey) ||
    SECRET_SETTING_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))
  );
};
