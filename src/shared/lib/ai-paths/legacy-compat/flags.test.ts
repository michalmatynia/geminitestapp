import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { isLegacyPathIndexCompatEnabled } from './flags';

const originalLegacyIndexEnv = process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
const originalLegacyIndexPublicEnv =
  process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];

describe('ai-paths legacy-compat flags', () => {
  beforeEach(() => {
    if (originalLegacyIndexEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = originalLegacyIndexEnv;
    }
    if (originalLegacyIndexPublicEnv === undefined) {
      delete process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] =
        originalLegacyIndexPublicEnv;
    }
  });

  afterAll(() => {
    if (originalLegacyIndexEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = originalLegacyIndexEnv;
    }
    if (originalLegacyIndexPublicEnv === undefined) {
      delete process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] =
        originalLegacyIndexPublicEnv;
    }
  });

  it('defaults legacy index compatibility flag to enabled', () => {
    delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    delete process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];

    expect(isLegacyPathIndexCompatEnabled()).toBe(true);
  });

  it('reads server-side legacy index compatibility flag from env', () => {
    process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = 'off';

    expect(isLegacyPathIndexCompatEnabled()).toBe(false);
  });

  it('falls back to NEXT_PUBLIC legacy index flag when server flag is missing', () => {
    delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    process.env['NEXT_PUBLIC_AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = '0';

    expect(isLegacyPathIndexCompatEnabled()).toBe(false);
  });
});
