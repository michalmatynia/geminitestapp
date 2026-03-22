/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env['NODE_ENV'];

const loadModule = async () => {
  vi.resetModules();
  return import('./legacy-sql-client');
};

describe('legacy-sql-client', () => {
  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = originalNodeEnv;
    }
  });

  it('exposes no-op lifecycle helpers in tests', async () => {
    const { default: legacySqlClient } = await loadModule();

    await expect(legacySqlClient.$connect()).resolves.toBeUndefined();
    await expect(legacySqlClient.$disconnect()).resolves.toBeUndefined();
    await expect(legacySqlClient.$resetAll()).resolves.toBeUndefined();
  });

  it('throws for all other legacy access and reports no properties as present', async () => {
    const { default: legacySqlClient } = await loadModule();

    expect('queryRaw' in legacySqlClient).toBe(false);
    expect(() => legacySqlClient.queryRaw).toThrow(/legacy sql client has been removed/i);
  });
});
