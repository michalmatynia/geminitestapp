import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readSecretSettingValueMock } = vi.hoisted(() => ({
  readSecretSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValue: readSecretSettingValueMock,
}));

import { getAuthEmailSecrets, getAuthOAuthSecrets } from './auth-secret-settings';

describe('auth secret settings helpers', () => {
  beforeEach(() => {
    readSecretSettingValueMock.mockReset();
  });

  it('loads OAuth secrets by provider', async () => {
    readSecretSettingValueMock
      .mockResolvedValueOnce('google-id')
      .mockResolvedValueOnce('google-secret')
      .mockResolvedValueOnce('facebook-id')
      .mockResolvedValueOnce('facebook-secret');

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
    readSecretSettingValueMock
      .mockResolvedValueOnce('https://hooks.example')
      .mockResolvedValueOnce('webhook-secret')
      .mockResolvedValueOnce('smtp.example.com')
      .mockResolvedValueOnce('2525')
      .mockResolvedValueOnce('mailer')
      .mockResolvedValueOnce('smtp-pass')
      .mockResolvedValueOnce(null);

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

    readSecretSettingValueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(getAuthEmailSecrets()).resolves.toEqual({
      webhookUrl: null,
      webhookSecret: null,
      smtp: null,
    });
  });
});
