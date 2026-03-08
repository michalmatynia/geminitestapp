import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveKangurMobileWebCorsOrigins', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('falls back to local expo-web defaults when the env var is unset', async () => {
    delete process.env['KANGUR_MOBILE_WEB_CORS_ORIGINS'];

    const { resolveKangurMobileWebCorsOrigins } = await import('./cors');

    expect(resolveKangurMobileWebCorsOrigins()).toEqual([
      'http://localhost:8081',
      'http://127.0.0.1:8081',
    ]);
  });

  it('parses, normalizes, and deduplicates configured origins', async () => {
    vi.stubEnv(
      'KANGUR_MOBILE_WEB_CORS_ORIGINS',
      ' https://mobile.example.com/app , http://localhost:8081/ , https://mobile.example.com '
    );

    const { resolveKangurMobileWebCorsOrigins } = await import('./cors');

    expect(resolveKangurMobileWebCorsOrigins()).toEqual([
      'https://mobile.example.com',
      'http://localhost:8081',
    ]);
  });

  it('ignores invalid origins and still keeps valid configured values', async () => {
    vi.stubEnv(
      'KANGUR_MOBILE_WEB_CORS_ORIGINS',
      'not-a-url, https://preview.example.com, also-not-valid'
    );

    const { resolveKangurMobileWebCorsOrigins } = await import('./cors');

    expect(resolveKangurMobileWebCorsOrigins()).toEqual(['https://preview.example.com']);
  });
});
