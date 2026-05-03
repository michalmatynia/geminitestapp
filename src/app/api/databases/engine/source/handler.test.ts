import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHandler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  applyActiveMongoSourceEnv: vi.fn(async () => undefined),
  getMongoSourceState: vi.fn(async () => ({
    timestamp: '2026-04-09T00:00:00.000Z',
    activeSource: 'local',
    defaultSource: 'local',
    lastSync: null,
      local: {
        source: 'local',
        configured: true,
        dbName: 'app_local',
        maskedUri: 'mongodb://localhost:27017/app_local',
        isActive: true,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
      cloud: {
        source: 'cloud',
        configured: true,
        dbName: 'app_cloud',
        maskedUri: 'mongodb+srv://cluster.example/app_cloud',
        isActive: false,
        usesLegacyEnv: false,
        reachable: true,
        healthError: null,
      },
    canSwitch: true,
    canSync: true,
    syncIssue: null,
  })),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/mongo-source', () => ({
  applyActiveMongoSourceEnv: mocks.applyActiveMongoSourceEnv,
  getMongoSourceState: mocks.getMongoSourceState,
}));

describe('databases engine source handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current Mongo source state', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/databases/engine/source'),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.applyActiveMongoSourceEnv).toHaveBeenCalled();
    expect(data.activeSource).toBe('local');
    expect(data.canSwitch).toBe(true);
  });
});
