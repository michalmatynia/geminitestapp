import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postHandler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  syncMongoSources: vi.fn(async () => ({
    success: true,
    message: 'MongoDB sync completed and verified: local -> cloud.',
    direction: 'local_to_cloud',
    source: 'local',
    target: 'cloud',
    syncedAt: '2026-05-07T12:00:00.000Z',
    preSyncBackups: [],
    archivePath: '/tmp/mongo-sync.archive',
    logPath: '/tmp/mongo-sync.log',
    applicationTransfers: [],
  })),
  invalidateMongoClientCache: vi.fn(async () => undefined),
  invalidateAppDbProviderCache: vi.fn(),
  invalidateCollectionProviderMapCache: vi.fn(),
  invalidateDatabaseEnginePolicyCache: vi.fn(),
  clearSettingsCache: vi.fn(),
  clearLiteSettingsServerCache: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: mocks.assertDatabaseEngineOperationEnabled,
}));

vi.mock('@/shared/lib/db/services/mongo-source-sync', () => ({
  syncMongoSources: mocks.syncMongoSources,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  invalidateMongoClientCache: mocks.invalidateMongoClientCache,
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

describe('databases engine managed sync handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs the requested managed Mongo application and clears dependent caches', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/databases/engine/managed/sync', {
        method: 'POST',
        body: JSON.stringify({ direction: 'local_to_cloud', application: 'cms-builder' }),
      }),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.assertDatabaseEngineOperationEnabled).toHaveBeenCalledWith(
      'allowManualFullSync'
    );
    expect(mocks.syncMongoSources).toHaveBeenCalledWith('local_to_cloud', 'cms-builder');
    expect(mocks.invalidateMongoClientCache).toHaveBeenCalled();
    expect(mocks.clearSettingsCache).toHaveBeenCalled();
    expect(data).toMatchObject({
      success: true,
      direction: 'local_to_cloud',
    });
  });
});
