import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      mocks.getConnectionByIdAndIntegrationMock(...args),
  }),
}));

const savedEnv: Record<string, string | undefined> = {};

const makeRequest = (path = '/api/v2/integrations/int-1/connections/conn-1/google/authorize') =>
  new NextRequest(`http://localhost:3000${path}`);

const setupMocks = (): void => {
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
    username: 'seller@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
};

describe('google integration authorize handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    for (const key of [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_INTEGRATIONS_OAUTH_REDIRECT_URI',
    ]) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';
    process.env['GOOGLE_INTEGRATIONS_OAUTH_REDIRECT_URI'] =
      'http://localhost:3000/api/v2/integrations/google/callback';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  const callHandler = async (request = makeRequest()) => {
    const { getHandler } = await import('./handler');
    return getHandler(request, {} as never, { id: 'int-1', connectionId: 'conn-1' });
  };

  it('redirects to Google with the stable integrations callback URL', async () => {
    setupMocks();

    const response = await callHandler();
    const location = new URL(response.headers.get('location') ?? '');

    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe('google-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/v2/integrations/google/callback'
    );
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('login_hint')).toBe('seller@example.com');
  });

  it('stores integration and connection IDs in state and sets the nonce cookie', async () => {
    setupMocks();

    const response = await callHandler();
    const location = new URL(response.headers.get('location') ?? '');
    const stateRaw = location.searchParams.get('state') ?? '';
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));

    expect(decoded).toEqual(
      expect.objectContaining({
        integrationId: 'int-1',
        connectionId: 'conn-1',
        redirectUri: 'http://localhost:3000/api/v2/integrations/google/callback',
        scope: 'openid email profile',
      })
    );
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      expect(setCookie).toContain('integrations_google_oauth_state_conn-1=');
    }
  });

  it('allows a caller to request a narrower or feature-specific scope', async () => {
    setupMocks();

    const response = await callHandler(makeRequest(
      '/api/v2/integrations/int-1/connections/conn-1/google/authorize?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly'
    ));
    const location = new URL(response.headers.get('location') ?? '');

    expect(location.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar.readonly'
    );
  });
});
