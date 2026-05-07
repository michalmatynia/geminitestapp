import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { postHandler } from './handler';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  enqueueProductAiJob: vi.fn(async () => ({
    id: 'job-managed-backup-1',
    productId: 'system',
    type: 'db_backup',
    jobType: 'db_backup',
    payload: {
      dbType: 'mongodb',
      entityType: 'system',
      source: 'database_engine_managed_backup',
      application: 'studiq',
    },
  })),
  enqueueProductAiJobToQueue: vi.fn(async () => undefined),
  markDatabaseBackupJobQueued: vi.fn(async () => undefined),
  processProductAiJob: vi.fn(async () => undefined),
  startProductAiJobQueue: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: mocks.assertDatabaseEngineOperationEnabled,
}));

vi.mock('@/features/database/server/jobs', () => ({
  enqueueProductAiJob: mocks.enqueueProductAiJob,
  enqueueProductAiJobToQueue: mocks.enqueueProductAiJobToQueue,
  processProductAiJob: mocks.processProductAiJob,
  startProductAiJobQueue: mocks.startProductAiJobQueue,
}));

vi.mock('@/shared/lib/db/services/database-backup-scheduler', () => ({
  markDatabaseBackupJobQueued: mocks.markDatabaseBackupJobQueued,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemError: vi.fn(async () => undefined),
}));

describe('databases engine managed backup handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queues a backup for the requested managed Mongo application', async () => {
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
    expect(mocks.enqueueProductAiJob).toHaveBeenCalledWith(
      'system',
      'db_backup',
      expect.objectContaining({
        dbType: 'mongodb',
        source: 'database_engine_managed_backup',
        application: 'studiq',
      })
    );
    expect(mocks.markDatabaseBackupJobQueued).toHaveBeenCalledWith('mongodb', 'job-managed-backup-1');
    expect(mocks.startProductAiJobQueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueProductAiJobToQueue).toHaveBeenCalledWith(
      'job-managed-backup-1',
      'system',
      'db_backup',
      expect.any(Object)
    );
    expect(mocks.processProductAiJob).not.toHaveBeenCalled();
    expect(data).toMatchObject({
      success: true,
      jobId: 'job-managed-backup-1',
      message: 'Managed MongoDB backup job queued for studiq.',
    });
  });
});
