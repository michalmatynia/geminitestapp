import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_handler, POST_handler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  applyActiveMongoSourceEnv: vi.fn(async () => undefined),
  getMongoSourceState: vi.fn(async () => ({
    timestamp: '2026-04-09T00:00:00.000Z',
    activeSource: 'local',
    defaultSource: 'local',
    sourceFilePath: '/tmp/mongo-source.json',
    local: {
      source: 'local',
      configured: true,
      dbName: 'app_local',
      maskedUri: 'mongodb://localhost:27017/app_local',
      isActive: true,
      usesLegacyEnv: false,
    },
    cloud: {
      source: 'cloud',
      configured: true,
      dbName: 'app_cloud',
      maskedUri: 'mongodb+srv://cluster.example/app_cloud',
      isActive: false,
      usesLegacyEnv: false,
    },
    canSwitch: true,
  })),
  setActiveMongoSource: vi.fn(async () => undefined),
  invalidateAppDbProviderCache: vi.fn(),
  invalidateCollectionProviderMapCache: vi.fn(),
  invalidateDatabaseEnginePolicyCache: vi.fn(),
  clearSettingsCache: vi.fn(),
  clearLiteSettingsServerCache: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  applyActiveMongoSourceEnv: mocks.applyActiveMongoSourceEnv,
  getMongoSourceState: mocks.getMongoSourceState,
  setActiveMongoSource: mocks.setActiveMongoSource,
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  invalidateAppDbProviderCache: mocks.invalidateAppDbProviderCache,
}));

vi.mock('@/shared/lib/db/collection-provider-map', () => ({
  invalidateCollectionProviderMapCache: mocks.invalidateCollectionProviderMapCache,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  invalidateDatabaseEnginePolicyCache: mocks.invalidateDatabaseEnginePolicyCache,
}));

vi.mock('@/shared/lib/settings-cache', () => ({
  clearSettingsCache: mocks.clearSettingsCache,
}));

vi.mock('@/shared/lib/settings-lite-server-cache', () => ({
  clearLiteSettingsServerCache: mocks.clearLiteSettingsServerCache,
}));

describe('databases engine source handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current Mongo source state', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/databases/engine/source'),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.applyActiveMongoSourceEnv).toHaveBeenCalled();
    expect(data.activeSource).toBe('local');
    expect(data.canSwitch).toBe(true);
  });

  it('switches the active Mongo source and clears dependent caches', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/databases/engine/source', {
        method: 'POST',
        body: JSON.stringify({ source: 'cloud' }),
      }),
      mockContext
    );
    const data = await response.json();

    expect(mocks.setActiveMongoSource).toHaveBeenCalledWith('cloud');
    expect(mocks.invalidateAppDbProviderCache).toHaveBeenCalled();
    expect(mocks.invalidateCollectionProviderMapCache).toHaveBeenCalled();
    expect(mocks.invalidateDatabaseEnginePolicyCache).toHaveBeenCalled();
    expect(mocks.clearSettingsCache).toHaveBeenCalled();
    expect(mocks.clearLiteSettingsServerCache).toHaveBeenCalled();
    expect(data.success).toBe(true);
    expect(data.message).toContain('switched to');
  });
});
