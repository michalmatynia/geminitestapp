import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getConnectionByIdMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn(),
  refreshGoogleOAuthTokenMock: vi.fn(),
}));

vi.mock('./integration-repository', () => ({
  getIntegrationRepository: () => ({
    getConnectionById: (...args: unknown[]) => mocks.getConnectionByIdMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  decryptSecret: (...args: unknown[]) => mocks.decryptSecretMock(...args),
  encryptSecret: (...args: unknown[]) => mocks.encryptSecretMock(...args),
}));

vi.mock('@/shared/lib/oauth/google-oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/oauth/google-oauth')>();
  return {
    ...actual,
    refreshGoogleOAuthToken: (...args: unknown[]) =>
      mocks.refreshGoogleOAuthTokenMock(...args),
  };
});

import { resolveIntegrationGoogleOAuthCredential } from './google-token-resolver';

const baseConnection = {
  id: 'conn-1',
  integrationId: 'integration-1',
  name: 'Primary',
  createdAt: new Date().toISOString(),
  updatedAt: null,
};

describe('resolveIntegrationGoogleOAuthCredential', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decryptSecretMock.mockImplementation((value: string) =>
      value.replace(/^enc:/, '')
    );
    mocks.encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
  });

  it('returns a cached non-expired access token', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      ...baseConnection,
      googleAccessToken: 'enc:cached-access',
      googleRefreshToken: 'enc:refresh-token',
      googleExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      googleScope: 'openid email profile',
    });

    await expect(resolveIntegrationGoogleOAuthCredential('conn-1')).resolves.toEqual({
      accessToken: 'cached-access',
      connectionId: 'conn-1',
      integrationId: 'integration-1',
      expiresAt: expect.any(String),
      scope: 'openid email profile',
      refreshed: false,
    });
    expect(mocks.refreshGoogleOAuthTokenMock).not.toHaveBeenCalled();
  });

  it('refreshes an expired access token and stores the encrypted replacement', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      ...baseConnection,
      googleAccessToken: 'enc:expired-access',
      googleRefreshToken: 'enc:refresh-token',
      googleExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      googleScope: 'openid email profile',
      googleTokenType: 'Bearer',
    });
    mocks.refreshGoogleOAuthTokenMock.mockResolvedValue({
      access_token: 'fresh-access',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid email profile',
    });

    const credential = await resolveIntegrationGoogleOAuthCredential('conn-1');

    expect(credential).toEqual(
      expect.objectContaining({
        accessToken: 'fresh-access',
        connectionId: 'conn-1',
        integrationId: 'integration-1',
        refreshed: true,
      })
    );
    expect(mocks.refreshGoogleOAuthTokenMock).toHaveBeenCalledWith({
      refreshToken: 'refresh-token',
      config: { serviceLabel: 'Google integrations' },
    });
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        googleAccessToken: 'enc:fresh-access',
        googleScope: 'openid email profile',
        googleExpiresAt: expect.any(Date),
        googleTokenUpdatedAt: expect.any(Date),
      })
    );
  });

  it('throws when the connection has no Google tokens', async () => {
    mocks.getConnectionByIdMock.mockResolvedValue({
      ...baseConnection,
      googleAccessToken: null,
      googleRefreshToken: null,
    });

    await expect(resolveIntegrationGoogleOAuthCredential('conn-1')).rejects.toThrow(
      'Google refresh token is not connected'
    );
  });
});
