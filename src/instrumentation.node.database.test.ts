/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateDatabaseConfig: vi.fn(),
  applyActiveMongoSourceEnv: vi.fn(async () => ({
    source: 'cloud',
    configured: true,
    uri: 'mongodb+srv://cluster.example/app',
    dbName: 'app',
    usesLegacyEnv: false,
  })),
}));

vi.mock('@/shared/lib/env', () => ({
  validateDatabaseConfig: mocks.validateDatabaseConfig,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  applyActiveMongoSourceEnv: mocks.applyActiveMongoSourceEnv,
}));

describe('prepareNodeDatabaseEnvironment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates the active Mongo source after validating runtime database config', async () => {
    const { prepareNodeDatabaseEnvironment } = await import('./instrumentation.node');

    await prepareNodeDatabaseEnvironment();

    expect(mocks.validateDatabaseConfig).toHaveBeenCalledTimes(1);
    expect(mocks.applyActiveMongoSourceEnv).toHaveBeenCalledTimes(1);
    expect(mocks.validateDatabaseConfig.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.applyActiveMongoSourceEnv.mock.invocationCallOrder[0] ?? 0
    );
  });
});
