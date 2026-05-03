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

const makeRequest = (): NextRequest =>
  new NextRequest('http://localhost:3000/api/v2/integrations/int-1/connections/conn-1/linkedin/authorize');

const setupMocks = (overrides?: { username?: string; password?: string }): void => {
  mocks.getIntegrationByIdMock.mockResolvedValue({
    id: 'int-1',
    slug: 'linkedin',
    name: 'LinkedIn',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
  mocks.getConnectionByIdAndIntegrationMock.mockResolvedValue({
    id: 'conn-1',
    integrationId: 'int-1',
    name: 'LinkedIn Main',
    username: overrides?.username ?? 'my-client-id',
    password: overrides?.password ?? 'my-client-secret',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
};

describe('linkedin authorize handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    for (const key of ['LINKEDIN_APP_KEY_SECRET', 'LINKEDIN_APP_CLIENT_SECRET']) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
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

  const callHandler = async (params = { id: 'int-1', connectionId: 'conn-1' }) => {
    const { getHandler } = await import('./handler');
    return getHandler(makeRequest(), {} as never, params);
  };

  it('redirects to LinkedIn authorization URL', async () => {
    setupMocks();
    const response = await callHandler();

    const location = response.headers.get('location') ?? '';
    expect(location).toContain('https://www.linkedin.com/oauth/v2/authorization');
  });

  it('uses the stable redirect_uri without dynamic IDs', async () => {
    setupMocks();
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    const redirectUri = location.searchParams.get('redirect_uri') ?? '';
    expect(redirectUri).toContain('/api/v2/integrations/linkedin/callback');
    expect(redirectUri).not.toContain('int-1');
    expect(redirectUri).not.toContain('conn-1');
    expect(redirectUri).not.toContain('/connections/');
  });

  it('encodes integration and connection IDs in base64url state', async () => {
    setupMocks();
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    const stateRaw = location.searchParams.get('state') ?? '';
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));

    expect(decoded).toEqual(
      expect.objectContaining({
        integrationId: 'int-1',
        connectionId: 'conn-1',
      })
    );
    expect(typeof decoded.nonce).toBe('string');
    expect(decoded.nonce.length).toBeGreaterThan(0);
  });

  it('state nonce is a valid UUID', async () => {
    setupMocks();
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    const stateRaw = location.searchParams.get('state') ?? '';
    const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));

    expect(decoded.nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('requests openid profile w_member_social scopes', async () => {
    setupMocks();
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('scope')).toBe('openid profile w_member_social');
  });

  it('uses connection username as client_id', async () => {
    setupMocks({ username: 'custom-client-id', password: 'custom-secret' });
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('client_id')).toBe('custom-client-id');
  });

  it('sets response_type to code', async () => {
    setupMocks();
    const response = await callHandler();

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.searchParams.get('response_type')).toBe('code');
  });

  it('throws when integration is not linkedin', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'int-1',
      slug: 'allegro',
      name: 'Allegro',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    await expect(callHandler()).rejects.toThrow();
  });

  it('throws when connection is not found', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'int-1',
      slug: 'linkedin',
      name: 'LinkedIn',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
    mocks.getConnectionByIdAndIntegrationMock.mockResolvedValue(null);

    await expect(callHandler()).rejects.toThrow();
  });

  it('throws when client ID is missing and no env fallback', async () => {
    setupMocks({ username: '', password: '' });

    await expect(callHandler()).rejects.toThrow('client ID is required');
  });

  it('throws when client secret is missing and no env fallback', async () => {
    // Provide client ID via env so the handler reaches the client secret check
    process.env['LINKEDIN_APP_KEY_SECRET'] = 'env-client-id';
    setupMocks({ username: '', password: '' });

    await expect(callHandler()).rejects.toThrow('client secret is required');
  });

  it('generates different state for each call', async () => {
    setupMocks();
    const { getHandler } = await import('./handler');
    const response1 = await getHandler(makeRequest(), {} as never, { id: 'int-1', connectionId: 'conn-1' });
    const response2 = await getHandler(makeRequest(), {} as never, { id: 'int-1', connectionId: 'conn-1' });

    const state1 = new URL(response1.headers.get('location') ?? '').searchParams.get('state');
    const state2 = new URL(response2.headers.get('location') ?? '').searchParams.get('state');
    expect(state1).not.toBe(state2);
  });
});
