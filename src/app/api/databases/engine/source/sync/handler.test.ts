import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST_handler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  syncMongoSources: vi.fn(async () => ({
    success: true,
    message: 'MongoDB sync completed: cloud -> local.',
    direction: 'cloud_to_local',
    source: 'cloud',
    target: 'local',
    syncedAt: '2026-04-09T04:30:00.000Z',
    archivePath: '/tmp/mongo-sync.archive',
    logPath: '/tmp/mongo-sync.log',
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

describe('databases engine source sync handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs a manual Mongo sync and clears dependent caches', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/databases/engine/source/sync', {
        method: 'POST',
        body: JSON.stringify({ direction: 'cloud_to_local' }),
      }),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.assertDatabaseEngineOperationEnabled).toHaveBeenCalledWith(
      'allowManualFullSync'
    );
    expect(mocks.syncMongoSources).toHaveBeenCalledWith('cloud_to_local');
    expect(mocks.invalidateMongoClientCache).toHaveBeenCalled();
    expect(mocks.clearSettingsCache).toHaveBeenCalled();
    expect(data.success).toBe(true);
    expect(data.direction).toBe('cloud_to_local');
  });
});
