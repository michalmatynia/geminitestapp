import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  encryptSecretMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      mocks.getConnectionByIdAndIntegrationMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
  encryptSecret: (...args: unknown[]) => mocks.encryptSecretMock(...args),
}));

const savedEnv: Record<string, string | undefined> = {};

const encodeState = (overrides?: Partial<Record<string, string>>): string =>
  Buffer.from(
    JSON.stringify({
      nonce: 'nonce-1',
      integrationId: 'int-1',
      connectionId: 'conn-1',
      redirectUri: 'http://localhost/api/v2/integrations/google/callback',
      scope: 'openid email profile',
      ...overrides,
    })
  ).toString('base64url');

const makeRequest = (state = encodeState()): NextRequest => {
  const request = new NextRequest(
    `http://localhost/api/v2/integrations/google/callback?code=auth-code&state=${state}`,
    {
      headers: {
        cookie: 'integrations_google_oauth_state_conn-1=nonce-1',
      },
    }
  );
  Object.defineProperty(request, 'cookies', {
    value: {
      get: (key: string) =>
        key === 'integrations_google_oauth_state_conn-1' ? { value: 'nonce-1' } : undefined,
    },
  });
  return request;
};

describe('google integrations callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';
    mocks.encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'int-1',
      slug: 'tradera',
      name: 'Tradera',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    mocks.getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-1',
      name: 'Tradera Browser',
      googleRefreshToken: 'enc:existing-refresh-token',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('exchanges the code and stores encrypted Google tokens on the connection', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          access_token: 'access-token-1',
          refresh_token: 'refresh-token-1',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid email profile',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    const { getHandler } = await import('./handler');

    const response = await getHandler(makeRequest(), {} as never);

    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        googleAccessToken: 'enc:access-token-1',
        googleRefreshToken: 'enc:refresh-token-1',
        googleTokenType: 'Bearer',
        googleScope: 'openid email profile',
        googleExpiresAt: expect.any(Date),
        googleTokenUpdatedAt: expect.any(Date),
      })
    );
    expect(response.headers.get('location')).toContain('google=connected');
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      expect(setCookie).toContain('integrations_google_oauth_state_conn-1=');
    }
  });

  it('keeps the existing refresh token when Google omits a new one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ access_token: 'access-token-2' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );
    const { getHandler } = await import('./handler');

    await getHandler(makeRequest(), {} as never);

    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        googleRefreshToken: 'enc:existing-refresh-token',
      })
    );
  });

  it('redirects with an error when the state nonce does not match the cookie', async () => {
    const { getHandler } = await import('./handler');

    const response = await getHandler(makeRequest(encodeState({ nonce: 'wrong' })), {} as never);

    expect(response.headers.get('location')).toContain('google=error');
    expect(mocks.updateConnectionMock).not.toHaveBeenCalled();
  });
});
