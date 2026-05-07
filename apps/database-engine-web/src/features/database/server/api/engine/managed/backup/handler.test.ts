import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postHandler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  createMongoManagedBackup: vi.fn(async () => ({
    message: 'Backup created',
    backupName: 'studiq/studiq-local-backup.archive',
    log: 'backup log',
  })),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: mocks.assertDatabaseEngineOperationEnabled,
}));

vi.mock('@/shared/lib/db/services/database-backup', () => ({
  createMongoManagedBackup: mocks.createMongoManagedBackup,
}));

describe('databases engine managed backup handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a backup for the requested managed Mongo application', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/databases/engine/managed/backup', {
        method: 'POST',
        body: JSON.stringify({ application: 'studiq' }),
      }),
      mockContext
    );
    const data = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.assertDatabaseEngineOperationEnabled).toHaveBeenCalledWith(
      'allowManualBackupRunNow'
    );
    expect(mocks.createMongoManagedBackup).toHaveBeenCalledWith('studiq');
    expect(data).toMatchObject({
      success: true,
      backupName: 'studiq/studiq-local-backup.archive',
    });
  });
});
