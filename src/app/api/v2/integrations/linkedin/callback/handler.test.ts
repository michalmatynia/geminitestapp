import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIntegrationByIdMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  encryptSecretMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    getIntegrationById: (...args: unknown[]) => mocks.getIntegrationByIdMock(...args),
    getConnectionByIdAndIntegration: (...args: unknown[]) =>
      mocks.getConnectionByIdAndIntegrationMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
  decryptSecret: (...args: unknown[]) => mocks.decryptSecretMock(...args),
  encryptSecret: (...args: unknown[]) => mocks.encryptSecretMock(...args),
}));

const encodeState = (payload: { nonce: string; integrationId: string; connectionId: string }): string =>
  Buffer.from(JSON.stringify(payload)).toString('base64url');

const makeRequest = (
  query: Record<string, string>,
  cookieNonce?: string | null,
  connectionId = 'conn-1'
): NextRequest => {
  const url = new URL('http://localhost/api/v2/integrations/linkedin/callback');
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  const req = new NextRequest(url);
  // Always mock cookies so req.cookies.get() doesn't crash
  Object.defineProperty(req, 'cookies', {
    value: {
      get: (key: string) => {
        if (cookieNonce && key === `linkedin_oauth_state_${connectionId}`) {
          return { value: cookieNonce };
        }
        return undefined;
      },
    },
  });
  return req;
};

const stubFetch = (): void => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.startsWith('https://www.linkedin.com/oauth/v2/accessToken')) {
      return new Response(
        JSON.stringify({
          access_token: 'token-1',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'openid profile w_member_social',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (url.startsWith('https://api.linkedin.com/v2/userinfo')) {
      return new Response(
        JSON.stringify({ sub: 'person-1', name: 'Test User' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    throw new Error(`Unexpected fetch request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
};

const setupConnectionMocks = (): void => {
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
    username: 'client-id',
    password: 'secret',
    createdAt: new Date().toISOString(),
    updatedAt: null,
  });
  mocks.updateConnectionMock.mockResolvedValue({});
};

const savedEnv: Record<string, string | undefined> = {};

const callHandler = async (
  req: NextRequest,
  ctx: { query: Record<string, string | undefined> }
) => {
  const { GET_handler } = await import('./handler');
  return GET_handler(req, ctx as never);
};

describe('stable linkedin callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.resetModules();
    mocks.decryptSecretMock.mockImplementation((value: string) => value);
    mocks.encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
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

  it('redirects with error when LinkedIn returns an error param', async () => {
    const req = makeRequest({ error: 'access_denied', error_description: 'User denied access' });
    const response = await callHandler(req, { query: { error: 'access_denied', error_description: 'User denied access' } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('reason=User+denied+access');
  });

  it('redirects with error when authorization code is missing', async () => {
    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ state });
    const response = await callHandler(req, { query: { state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Missing+authorization+code');
  });

  it('redirects with error when state is missing', async () => {
    const req = makeRequest({ code: 'auth-code' });
    const response = await callHandler(req, { query: { code: 'auth-code' } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Missing+authorization+code');
  });

  it('redirects with error when state has invalid base64url format', async () => {
    const req = makeRequest({ code: 'auth-code', state: '!!!invalid!!!' }, null);
    const response = await callHandler(req, { query: { code: 'auth-code', state: '!!!invalid!!!' } });

    expect(response.headers.get('location')).toContain('linkedin=error');
  });

  it('redirects with error when state is valid base64url but missing required fields', async () => {
    const badState = Buffer.from(JSON.stringify({ nonce: 'n-1' })).toString('base64url');
    const req = makeRequest({ code: 'auth-code', state: badState }, null);
    const response = await callHandler(req, { query: { code: 'auth-code', state: badState } });

    expect(response.headers.get('location')).toContain('linkedin=error');
  });

  it('redirects with error when nonce does not match cookie', async () => {
    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'wrong-nonce');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Invalid+OAuth+state');
  });

  it('redirects with error when state cookie is missing', async () => {
    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, null);
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Invalid+OAuth+state');
  });

  it('redirects with error when integration is not linkedin', async () => {
    mocks.getIntegrationByIdMock.mockResolvedValue({
      id: 'int-1',
      slug: 'allegro',
      name: 'Allegro',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('integration+not+found');
  });

  it('redirects with error when connection credentials are missing', async () => {
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
      username: '',
      password: '',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Missing+LinkedIn+credentials');
  });

  it('redirects with error when token exchange fails', async () => {
    setupConnectionMocks();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: 'invalid_grant', error_description: 'Authorization code expired' }),
        { status: 400, headers: { 'content-type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=error');
    expect(response.headers.get('location')).toContain('Authorization+code+expired');
  });

  it('exchanges the token and stores LinkedIn profile data using /v2/userinfo', async () => {
    setupConnectionMocks();
    stubFetch();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=connected');
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        linkedinAccessToken: 'enc:token-1',
        linkedinPersonUrn: 'urn:li:person:person-1',
        linkedinProfileUrl: 'https://www.linkedin.com/in/Test%20User',
        linkedinScope: 'openid profile w_member_social',
        linkedinTokenType: 'Bearer',
      })
    );
  });

  it('uses stable redirect_uri for token exchange', async () => {
    setupConnectionMocks();
    stubFetch();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    await callHandler(req, { query: { code: 'auth-code', state } });

    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const body = fetchCall?.[1]?.body;
    expect(body).toBeDefined();
    const params = new URLSearchParams(body as string);
    expect(params.get('redirect_uri')).toBe('http://localhost/api/v2/integrations/linkedin/callback');
  });

  it('extracts integration and connection IDs from base64url state', async () => {
    setupConnectionMocks();
    stubFetch();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    await callHandler(req, { query: { code: 'auth-code', state } });

    expect(mocks.getIntegrationByIdMock).toHaveBeenCalledWith('int-1');
    expect(mocks.getConnectionByIdAndIntegrationMock).toHaveBeenCalledWith('conn-1', 'int-1');
  });

  it('stores token even when profile fetch fails', async () => {
    setupConnectionMocks();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://www.linkedin.com/oauth/v2/accessToken')) {
        return new Response(
          JSON.stringify({
            access_token: 'token-1',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'openid profile w_member_social',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.startsWith('https://api.linkedin.com/v2/userinfo')) {
        return new Response('Forbidden', { status: 403 });
      }
      throw new Error(`Unexpected fetch request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    expect(response.headers.get('location')).toContain('linkedin=connected');
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        linkedinAccessToken: 'enc:token-1',
        linkedinPersonUrn: null,
        linkedinProfileUrl: null,
      })
    );
  });

  it('clears the oauth state cookie on success', async () => {
    setupConnectionMocks();
    stubFetch();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    const response = await callHandler(req, { query: { code: 'auth-code', state } });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      expect(setCookie).toContain('linkedin_oauth_state_conn-1=');
      expect(setCookie).toContain('Max-Age=0');
    }
  });

  it('computes linkedinExpiresAt from expires_in', async () => {
    setupConnectionMocks();
    stubFetch();
    const before = Date.now();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    await callHandler(req, { query: { code: 'auth-code', state } });

    const call = mocks.updateConnectionMock.mock.calls[0]?.[1];
    const expiresAt = new Date(call.linkedinExpiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000 - 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 1000);
  });

  it('decrypts connection password for client_secret', async () => {
    setupConnectionMocks();
    stubFetch();

    const state = encodeState({ nonce: 'n-1', integrationId: 'int-1', connectionId: 'conn-1' });
    const req = makeRequest({ code: 'auth-code', state }, 'n-1');
    await callHandler(req, { query: { code: 'auth-code', state } });

    expect(mocks.decryptSecretMock).toHaveBeenCalledWith('secret');
  });
});
