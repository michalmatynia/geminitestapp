import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  assertValidMongoBackupName: vi.fn(),
  unlink: vi.fn(async () => undefined),
}));

vi.mock('fs', () => ({
  default: {
    promises: {
      unlink: mocks.unlink,
    },
  },
  promises: {
    unlink: mocks.unlink,
  },
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
  assertValidMongoBackupName: mocks.assertValidMongoBackupName,
  mongoBackupsDir: '/tmp/mongo-backups',
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: mocks.assertDatabaseEngineOperationEnabled,
}));

import { postHandler } from './handler';

const buildDeleteRequest = (backupName: string): NextRequest =>
  new NextRequest('http://localhost/api/databases/delete', {
    method: 'POST',
    body: JSON.stringify({ backupName, type: 'mongodb' }),
    headers: { 'content-type': 'application/json' },
  });

describe('databases delete handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.unlink.mockResolvedValue(undefined);
  });

  it('deletes the selected archive and its local log sidecars', async () => {
    const response = await postHandler(buildDeleteRequest('old-local.archive'), mockContext);
    const body = await response.json();

    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.assertDatabaseEngineOperationEnabled).toHaveBeenCalledWith(
      'allowManualBackupMaintenance'
    );
    expect(mocks.assertValidMongoBackupName).toHaveBeenCalledWith('old-local.archive');
    expect(mocks.unlink).toHaveBeenNthCalledWith(1, '/tmp/mongo-backups/old-local.archive');
    expect(mocks.unlink).toHaveBeenNthCalledWith(2, '/tmp/mongo-backups/old-local.archive.log');
    expect(mocks.unlink).toHaveBeenNthCalledWith(
      3,
      '/tmp/mongo-backups/old-local.archive.restore.log'
    );
    expect(body).toEqual({
      success: true,
      backupName: 'old-local.archive',
      message: 'Backup deleted',
    });
  });

  it('does not fail when old backups do not have log sidecars', async () => {
    mocks.unlink.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('.log')) {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      }
    });

    const response = await postHandler(buildDeleteRequest('legacy-local.archive'), mockContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.backupName).toBe('legacy-local.archive');
  });
});
