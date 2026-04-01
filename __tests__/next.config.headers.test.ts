import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config.mjs';

describe('next.config headers', () => {
  it('includes media-src in the global CSP for data-based caption tracks', async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === '/:path*')?.headers ?? [];
    const csp = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value;

    expect(csp).toContain("media-src 'self' data: blob:");
  });

  it('allows the bracketed IPv6 loopback origin in dev', () => {
    const allowedDevOrigins = nextConfig.allowedDevOrigins ?? [];

    expect(allowedDevOrigins).toContain('[::1]');
  });
});
