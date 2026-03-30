import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdvancedApiConfig, RuntimePortValues } from '@/shared/contracts/ai-paths';
import { fetchWithOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';

import { resolveAuthHeaders } from './auth';

vi.mock('@/shared/lib/security/outbound-url-policy', () => ({
  fetchWithOutboundUrlPolicy: vi.fn(),
}));

const mockedFetchWithOutboundUrlPolicy = vi.mocked(fetchWithOutboundUrlPolicy);

const buildConfig = (patch: Partial<AdvancedApiConfig> = {}): AdvancedApiConfig =>
  ({
    authMode: 'none',
    ...patch,
  }) as AdvancedApiConfig;

const buildInputs = (patch: RuntimePortValues = {}): RuntimePortValues => ({
  clientId: 'client-id',
  clientSecret: 'client-secret',
  connectionId: 'connection-42',
  scope: 'read write',
  token: 'secret-token',
  tokenUrl: 'https://example.test/oauth/token',
  username: 'duel-user',
  value: 'runtime-value',
  ...patch,
});

describe('resolveAuthHeaders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds API key auth to query params when requested', async () => {
    const result = await resolveAuthHeaders(
      buildConfig({
        authMode: 'api_key',
        apiKeyName: 'api_key',
        apiKeyPlacement: 'query',
        apiKeyValueTemplate: '{{token}}',
      }),
      buildInputs(),
      { Existing: 'header' },
      { page: '1' }
    );

    expect(result.headers).toEqual({ Existing: 'header' });
    expect(result.queryParams).toEqual({
      api_key: 'secret-token',
      page: '1',
    });
  });

  it('adds bearer auth to headers', async () => {
    const result = await resolveAuthHeaders(
      buildConfig({
        authMode: 'bearer',
        bearerTokenTemplate: '{{token}}',
      }),
      buildInputs(),
      {},
      {}
    );

    expect(result.headers).toEqual({
      Authorization: 'Bearer secret-token',
    });
    expect(result.queryParams).toEqual({});
  });

  it('adds basic auth to headers', async () => {
    const result = await resolveAuthHeaders(
      buildConfig({
        authMode: 'basic',
        basicPasswordTemplate: '{{token}}',
        basicUsernameTemplate: '{{username}}',
      }),
      buildInputs(),
      {},
      {}
    );

    expect(result.headers).toEqual({
      Authorization: `Basic ${btoa('duel-user:secret-token')}`,
    });
    expect(result.queryParams).toEqual({});
  });

  it('adds connection auth with the default header name', async () => {
    const result = await resolveAuthHeaders(
      buildConfig({
        authMode: 'connection',
        connectionHeaderName: '  ',
        connectionIdTemplate: '{{connectionId}}',
      }),
      buildInputs(),
      {},
      {}
    );

    expect(result.headers).toEqual({
      'X-Connection-Id': 'connection-42',
    });
    expect(result.queryParams).toEqual({});
  });

  it('resolves oauth client credentials auth and injects the access token', async () => {
    mockedFetchWithOutboundUrlPolicy.mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'oauth-access-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await resolveAuthHeaders(
      buildConfig({
        authMode: 'oauth2_client_credentials',
        oauthClientIdTemplate: '{{clientId}}',
        oauthClientSecretTemplate: '{{clientSecret}}',
        oauthScopeTemplate: '{{scope}}',
        oauthTokenUrl: '{{tokenUrl}}',
      }),
      buildInputs(),
      {},
      {}
    );

    expect(mockedFetchWithOutboundUrlPolicy).toHaveBeenCalledTimes(1);
    expect(result.headers).toEqual({
      Authorization: 'Bearer oauth-access-token',
    });
    expect(result.queryParams).toEqual({});
  });
});
