import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getDefaultHeapMb,
  getPreferredBundler,
  resolveBundlerArgs,
  shouldRetryWithWebpack,
  shouldRetryWebpackServerManifestRace,
} = require('./run-next-build.cjs');

describe('run-next-build', () => {
  it('uses a higher default heap on Vercel builds', () => {
    const originalVercel = process.env.VERCEL;
    const originalHeap = process.env.NEXT_BUILD_HEAP_MB;

    try {
      delete process.env.NEXT_BUILD_HEAP_MB;
      process.env.VERCEL = '1';
      expect(getDefaultHeapMb()).toBe('6144');

      process.env.VERCEL = '';
      expect(getDefaultHeapMb()).toBe('8192');

      process.env.NEXT_BUILD_HEAP_MB = '3072';
      expect(getDefaultHeapMb()).toBe('3072');

      process.env.NEXT_BUILD_HEAP_MB = '256';
      expect(getDefaultHeapMb()).toBe('1024');
    } finally {
      if (typeof originalVercel === 'string') {
        process.env.VERCEL = originalVercel;
      } else {
        delete process.env.VERCEL;
      }

      if (typeof originalHeap === 'string') {
        process.env.NEXT_BUILD_HEAP_MB = originalHeap;
      } else {
        delete process.env.NEXT_BUILD_HEAP_MB;
      }
    }
  });

  it('defaults to Turbopack when no explicit bundler is forced', () => {
    expect(getPreferredBundler('')).toBe('turbopack');
    expect(getPreferredBundler('invalid')).toBe('turbopack');
  });

  it('keeps explicit bundler overrides', () => {
    expect(getPreferredBundler('webpack')).toBe('webpack');
    expect(getPreferredBundler('turbopack')).toBe('turbopack');
  });

  it('maps bundlers to the expected Next CLI args', () => {
    expect(resolveBundlerArgs('turbopack')).toEqual(['build']);
    expect(resolveBundlerArgs('webpack')).toEqual(['build', '--webpack']);
  });

  it('allows webpack fallback only for transient Turbopack failures when Turbopack was not explicitly forced', () => {
    const transientRace = {
      bundler: 'turbopack',
      code: 1,
      signal: null,
      output:
        "ENOENT: no such file or directory, open '/tmp/project/.next/static/chunks/_buildManifest.js.tmp.123'",
    };

    expect(shouldRetryWithWebpack(transientRace, '')).toBe(true);
    expect(shouldRetryWithWebpack(transientRace, 'webpack')).toBe(true);
    expect(shouldRetryWithWebpack(transientRace, 'turbopack')).toBe(false);
  });

  it('does not retry non-transient Turbopack failures with webpack', () => {
    const nonTransientFailure = {
      bundler: 'turbopack',
      code: 1,
      signal: null,
      output: 'Syntax error in application code',
    };

    expect(shouldRetryWithWebpack(nonTransientFailure, '')).toBe(false);
  });

  it('retries the known webpack server manifest race once', () => {
    expect(
      shouldRetryWebpackServerManifestRace({
        bundler: 'webpack',
        code: 1,
        signal: null,
        output: "Cannot find module '/tmp/project/.next/server/middleware-manifest.json'",
      })
    ).toBe(true);
  });

  it('does not retry webpack failures that are not the known server manifest race', () => {
    expect(
      shouldRetryWebpackServerManifestRace({
        bundler: 'webpack',
        code: 1,
        signal: null,
        output: 'Application code failed to compile',
      })
    ).toBe(false);
  });
});
