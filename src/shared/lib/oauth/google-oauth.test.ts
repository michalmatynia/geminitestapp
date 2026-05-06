import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readSecretSettingValuesMock } = vi.hoisted(() => ({
  readSecretSettingValuesMock: vi.fn(),
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValues: readSecretSettingValuesMock,
}));

import {
  GOOGLE_MAIL_SCOPE,
  buildGoogleOAuthAuthorizationUrl,
  buildGoogleOAuthRedirectUri,
  exchangeGoogleOAuthAuthorizationCode,
  readGoogleOAuthCallbackInput,
  readGoogleOAuthConfig,
  readGoogleOAuthRefreshToken,
  refreshGoogleOAuthAccessToken,
} from './google-oauth';

describe('shared Google OAuth helpers', () => {
  const originalClientId = process.env['GOOGLE_CLIENT_ID'];
  const originalClientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const originalRedirectUri = process.env['GOOGLE_MAIL_OAUTH_REDIRECT_URI'];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env['GOOGLE_CLIENT_ID'] = 'your_google_client_id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'your_google_client_secret';
    delete process.env['GOOGLE_MAIL_OAUTH_REDIRECT_URI'];
    readSecretSettingValuesMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalClientId === undefined) delete process.env['GOOGLE_CLIENT_ID'];
    else process.env['GOOGLE_CLIENT_ID'] = originalClientId;
    if (originalClientSecret === undefined) delete process.env['GOOGLE_CLIENT_SECRET'];
    else process.env['GOOGLE_CLIENT_SECRET'] = originalClientSecret;
    if (originalRedirectUri === undefined) delete process.env['GOOGLE_MAIL_OAUTH_REDIRECT_URI'];
    else process.env['GOOGLE_MAIL_OAUTH_REDIRECT_URI'] = originalRedirectUri;
  });

  it('falls back to shared secret settings when env values are placeholders', async () => {
    readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: 'settings-client-id',
      auth_google_client_secret: 'settings-client-secret',
    });

    await expect(readGoogleOAuthConfig()).resolves.toEqual({
      clientId: 'settings-client-id',
      clientSecret: 'settings-client-secret',
    });
  });

  it('builds an offline Google authorization URL for any feature scope', () => {
    const url = new URL(
      buildGoogleOAuthAuthorizationUrl({
        config: { clientId: 'client-id', clientSecret: 'client-secret' },
        redirectUri: 'https://app.example.com/oauth/callback',
        scopes: [GOOGLE_MAIL_SCOPE, 'openid email'],
        state: 'state-1',
        loginHint: 'person@example.com',
      })
    );

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/oauth/callback');
    expect(url.searchParams.get('scope')).toBe(`${GOOGLE_MAIL_SCOPE} openid email`);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('include_granted_scopes')).toBe('true');
    expect(url.searchParams.get('login_hint')).toBe('person@example.com');
    expect(url.searchParams.get('state')).toBe('state-1');
  });

  it('uses configured redirect URI overrides per feature', () => {
    process.env['GOOGLE_MAIL_OAUTH_REDIRECT_URI'] = 'https://app.example.com/google/mail';

    expect(
      buildGoogleOAuthRedirectUri(new Request('http://localhost:3000/anything'), {
        envKey: 'GOOGLE_MAIL_OAUTH_REDIRECT_URI',
        path: '/api/filemaker/mail/google/oauth/callback',
      })
    ).toBe('https://app.example.com/google/mail');
  });

  it('exchanges authorization codes and refresh tokens through the shared token endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: 'access-1',
          refresh_token: 'refresh-1',
          scope: GOOGLE_MAIL_SCOPE,
        })
      )
      .mockResolvedValueOnce(Response.json({ access_token: 'access-2' }));
    vi.stubGlobal('fetch', fetchMock);

    const token = await exchangeGoogleOAuthAuthorizationCode({
      code: 'code-1',
      redirectUri: 'https://app.example.com/oauth/callback',
      config: { clientId: 'client-id', clientSecret: 'client-secret' },
    });
    const refreshed = await refreshGoogleOAuthAccessToken({
      refreshToken: readGoogleOAuthRefreshToken(token),
      config: { clientId: 'client-id', clientSecret: 'client-secret' },
    });

    expect(readGoogleOAuthRefreshToken(token)).toBe('refresh-1');
    expect(refreshed).toBe('access-2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain('grant_type=authorization_code');
    expect(String(fetchMock.mock.calls[1]?.[1]?.body)).toContain('grant_type=refresh_token');
  });

  it('parses Google OAuth callback code and state', () => {
    const request = new Request('https://app.example.com/callback?code=abc&state=xyz');

    expect(readGoogleOAuthCallbackInput(request)).toEqual({
      code: 'abc',
      state: 'xyz',
    });
  });
});
