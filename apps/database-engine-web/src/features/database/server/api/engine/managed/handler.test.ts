import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHandler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  getManagedMongoDatabasesStatus: vi.fn(async () => ({
    timestamp: '2026-05-07T12:00:00.000Z',
    backupRoot: '/tmp/database/mongo-backups',
    databases: [],
    canBackupAllLocal: true,
    canPushAllToCloud: true,
    canPullAllFromCloud: true,
    issues: [],
  })),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/services/managed-mongo-databases', () => ({
  getManagedMongoDatabasesStatus: mocks.getManagedMongoDatabasesStatus,
}));

describe('databases engine managed handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns managed Mongo application database status', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/databases/engine/managed'),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.getManagedMongoDatabasesStatus).toHaveBeenCalled();
    expect(data).toMatchObject({
      backupRoot: '/tmp/database/mongo-backups',
      canBackupAllLocal: true,
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
