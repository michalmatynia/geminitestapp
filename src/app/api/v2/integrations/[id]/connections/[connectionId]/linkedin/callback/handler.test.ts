import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { GET_handler } from './handler';

describe('integration linkedin callback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decryptSecretMock.mockImplementation((value: string) => value);
    mocks.encryptSecretMock.mockImplementation((value: string) => `enc:${value}`);
  });

  it('redirects with an error when authorization code is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/v2/integrations/int-1/connections/conn-1/linkedin/callback'
    );
    const response = await GET_handler(
      req,
      { query: { state: 'state-1' } } as never,
      { id: 'int-1', connectionId: 'conn-1' }
    );

    expect(response.headers.get('location')).toContain('linkedin=error');
  });

  it('exchanges the token and stores the LinkedIn profile data', async () => {
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

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('https://www.linkedin.com/oauth/v2/accessToken')) {
        return new Response(
          JSON.stringify({
            access_token: 'token-1',
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'r_liteprofile w_member_social',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      if (url.startsWith('https://api.linkedin.com/v2/me')) {
        return new Response(
          JSON.stringify({ id: 'person-1', vanityName: 'kangur' }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }
      throw new Error(`Unexpected fetch request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new NextRequest(
      'http://localhost/api/v2/integrations/int-1/connections/conn-1/linkedin/callback'
    );
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (key: string) =>
          key === 'linkedin_oauth_state_conn-1' ? { value: 'state-1' } : undefined,
      },
    });

    const response = await GET_handler(
      req,
      { query: { code: 'auth-code', state: 'state-1' } } as never,
      { id: 'int-1', connectionId: 'conn-1' }
    );

    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        linkedinAccessToken: 'enc:token-1',
        linkedinPersonUrn: 'urn:li:person:person-1',
        linkedinProfileUrl: 'https://www.linkedin.com/in/kangur',
      })
    );
    expect(response.headers.get('location')).toContain('linkedin=connected');
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      expect(setCookie).toContain('linkedin_oauth_state_conn-1=');
    }
  });
});
