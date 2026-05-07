/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Job } from './product-ai-processors.types';

const {
  createMongoBackupMock,
  createMongoManagedBackupMock,
  markDatabaseBackupJobFailedMock,
  markDatabaseBackupJobRunningMock,
  markDatabaseBackupJobSucceededMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  createMongoBackupMock: vi.fn(),
  createMongoManagedBackupMock: vi.fn(),
  markDatabaseBackupJobFailedMock: vi.fn(),
  markDatabaseBackupJobRunningMock: vi.fn(),
  markDatabaseBackupJobSucceededMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/services/database-backup', () => ({
  createMongoBackup: createMongoBackupMock,
  createMongoManagedBackup: createMongoManagedBackupMock,
}));

vi.mock('@/shared/lib/db/services/database-backup-scheduler', () => ({
  markDatabaseBackupJobFailed: markDatabaseBackupJobFailedMock,
  markDatabaseBackupJobRunning: markDatabaseBackupJobRunningMock,
  markDatabaseBackupJobSucceeded: markDatabaseBackupJobSucceededMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

vi.mock('./product-ai-processors.bulk', () => ({
  processBase64ConvertAll: vi.fn(),
  processBaseImageSyncAll: vi.fn(),
}));

vi.mock('./product-ai-processors.graph-model', () => ({
  processGraphModel: vi.fn(),
}));

import { processDatabaseBackup } from './product-ai-processors';

const buildBackupJob = (payload: Record<string, unknown>): Job => {
  const now = new Date('2026-05-07T10:00:00.000Z');
  return {
    id: 'job-backup-1',
    productId: 'system',
    status: 'pending',
    type: 'db_backup',
    payload,
    result: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
};

describe('product AI database backup processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMongoBackupMock.mockResolvedValue({
      message: 'Backups created',
      backupName: 'geminitestapp/app.archive',
      log: 'generic backup log',
    });
    createMongoManagedBackupMock.mockResolvedValue({
      message: 'Backup created',
      backupName: 'studiq/studiq.archive',
      log: 'managed backup log',
    });
  });

  it('runs the generic all-application Mongo backup when no managed application is present', async () => {
    const result = await processDatabaseBackup(buildBackupJob({ dbType: 'mongodb' }));

    expect(createMongoBackupMock).toHaveBeenCalledTimes(1);
    expect(createMongoManagedBackupMock).not.toHaveBeenCalled();
    expect(markDatabaseBackupJobRunningMock).toHaveBeenCalledWith('mongodb', 'job-backup-1');
    expect(markDatabaseBackupJobSucceededMock).toHaveBeenCalledWith('mongodb', 'job-backup-1');
    expect(result).toMatchObject({
      dbType: 'mongodb',
      backupName: 'geminitestapp/app.archive',
    });
  });

  it('routes managed backup payloads to the requested application backup', async () => {
    const result = await processDatabaseBackup(
      buildBackupJob({ dbType: 'mongodb', application: 'studiq' })
    );

    expect(createMongoManagedBackupMock).toHaveBeenCalledWith('studiq');
    expect(createMongoBackupMock).not.toHaveBeenCalled();
    expect(markDatabaseBackupJobRunningMock).toHaveBeenCalledWith('mongodb', 'job-backup-1');
    expect(markDatabaseBackupJobSucceededMock).toHaveBeenCalledWith('mongodb', 'job-backup-1');
    expect(result).toMatchObject({
      dbType: 'mongodb',
      backupName: 'studiq/studiq.archive',
    });
  });
});
