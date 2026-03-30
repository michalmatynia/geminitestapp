import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readSecretSettingValuesMock } = vi.hoisted(() => ({
  readSecretSettingValuesMock: vi.fn(),
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValues: readSecretSettingValuesMock,
}));

import { getAuthEmailSecrets, getAuthOAuthSecrets } from './auth-secret-settings';

describe('auth secret settings helpers', () => {
  beforeEach(() => {
    readSecretSettingValuesMock.mockReset();
  });

  it('loads OAuth secrets by provider', async () => {
    readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: 'google-id',
      auth_google_client_secret: 'google-secret',
      auth_facebook_client_id: 'facebook-id',
      auth_facebook_client_secret: 'facebook-secret',
    });

    await expect(getAuthOAuthSecrets()).resolves.toEqual({
      google: {
        clientId: 'google-id',
        clientSecret: 'google-secret',
      },
      facebook: {
        clientId: 'facebook-id',
        clientSecret: 'facebook-secret',
      },
    });
  });

  it('builds SMTP settings only when the required secrets exist', async () => {
    readSecretSettingValuesMock.mockResolvedValueOnce({
      auth_email_webhook_url: 'https://hooks.example',
      auth_email_webhook_secret: 'webhook-secret',
      auth_smtp_host: 'smtp.example.com',
      auth_smtp_port: '2525',
      auth_smtp_user: 'mailer',
      auth_smtp_pass: 'smtp-pass',
      auth_smtp_from: null,
    });

    await expect(getAuthEmailSecrets()).resolves.toEqual({
      webhookUrl: 'https://hooks.example',
      webhookSecret: 'webhook-secret',
      smtp: {
        host: 'smtp.example.com',
        port: 2525,
        user: 'mailer',
        pass: 'smtp-pass',
        from: 'mailer',
      },
    });

    readSecretSettingValuesMock.mockResolvedValueOnce({
      auth_email_webhook_url: null,
      auth_email_webhook_secret: null,
      auth_smtp_host: null,
      auth_smtp_port: null,
      auth_smtp_user: null,
      auth_smtp_pass: null,
      auth_smtp_from: null,
    });

    await expect(getAuthEmailSecrets()).resolves.toEqual({
      webhookUrl: null,
      webhookSecret: null,
      smtp: null,
    });
  });
});
