import { describe, expect, it } from 'vitest';

import nextConfig from './next.config.mjs';

describe('apps/studiq-web next.config', () => {
  it('defines the shared cacheLife profiles used by standalone Kangur server code', () => {
    expect(nextConfig.cacheComponents).toBe(true);
    expect(nextConfig.cacheLife).toMatchObject({
      swr60: {
        stale: 60,
        revalidate: 60,
        expire: 300,
      },
      swr300: {
        stale: 300,
        revalidate: 300,
        expire: 3600,
      },
      swr86400: {
        stale: 300,
        revalidate: 86400,
        expire: 604800,
      },
    });
  });
});
