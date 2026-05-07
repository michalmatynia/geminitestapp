/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAiJobRecord, ProductAiJobUpdate, QueueConfig } from '@/shared/contracts/jobs';

const mocks = vi.hoisted(() => {
  const queue = {
    enqueue: vi.fn(async () => 'bull-job-1'),
    getHealthStatus: vi.fn(async () => ({
      deliveryMode: 'queue',
      workerState: 'idle',
      redisAvailable: true,
      workerLocal: true,
      running: true,
      healthy: true,
      processing: false,
      waitingCount: 1,
      activeCount: 0,
      completedCount: 0,
      failedCount: 0,
    })),
    getQueue: vi.fn(() => null),
    processInline: vi.fn(async () => undefined),
    startWorker: vi.fn(),
    stopWorker: vi.fn(async () => undefined),
  };
  return {
    createManagedQueue: vi.fn((config: QueueConfig<unknown>) => {
      state.queueConfig = config;
      return queue;
    }),
    createMongoBackup: vi.fn(async () => ({
      message: 'Backups created',
      backupName: 'geminitestapp/app.archive',
      log: 'backup log',
    })),
    createMongoManagedBackup: vi.fn(async () => ({
      message: 'Backup created',
      backupName: 'studiq/studiq.archive',
      log: 'managed backup log',
    })),
    getProductAiJobRepository: vi.fn(),
    markDatabaseBackupJobFailed: vi.fn(async () => undefined),
    markDatabaseBackupJobRunning: vi.fn(async () => undefined),
    markDatabaseBackupJobSucceeded: vi.fn(async () => undefined),
    queue,
    repository: {
      createJob: vi.fn(),
      findJobs: vi.fn(async () => []),
      findJobById: vi.fn(),
      updateJob: vi.fn(),
    },
  };
});

const state = vi.hoisted(() => ({
  queueConfig: null as QueueConfig<unknown> | null,
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: mocks.createManagedQueue,
}));

vi.mock('@/shared/lib/db/services/database-backup', () => ({
  createMongoBackup: mocks.createMongoBackup,
  createMongoManagedBackup: mocks.createMongoManagedBackup,
}));

vi.mock('@/shared/lib/db/services/database-backup-scheduler', () => ({
  markDatabaseBackupJobFailed: mocks.markDatabaseBackupJobFailed,
  markDatabaseBackupJobRunning: mocks.markDatabaseBackupJobRunning,
  markDatabaseBackupJobSucceeded: mocks.markDatabaseBackupJobSucceeded,
}));

vi.mock('@/shared/lib/products/services/product-ai-job-repository', () => ({
  getProductAiJobRepository: mocks.getProductAiJobRepository,
}));

import {
  enqueueProductAiJobToQueue,
  getQueueStatus,
  processProductAiJob,
  startProductAiJobQueue,
} from './jobs';

const buildRecord = (overrides: Partial<ProductAiJobRecord> = {}): ProductAiJobRecord => ({
  id: 'job-1',
  productId: 'system',
  status: 'pending',
  type: 'db_backup',
  payload: { dbType: 'mongodb' },
  result: null,
  errorMessage: null,
  createdAt: new Date('2026-05-07T10:00:00.000Z'),
  updatedAt: new Date('2026-05-07T10:00:00.000Z'),
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

describe('database engine db backup jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProductAiJobRepository.mockResolvedValue(mocks.repository);
    mocks.repository.findJobById.mockResolvedValue(buildRecord());
    mocks.repository.updateJob.mockImplementation(
      async (jobId: string, update: ProductAiJobUpdate) =>
        buildRecord({
          id: jobId,
          ...update,
          updatedAt: new Date('2026-05-07T10:01:00.000Z'),
        })
    );
  });

  it('starts and enqueues Database Engine backup jobs through the Redis runtime queue', async () => {
    startProductAiJobQueue();
    await enqueueProductAiJobToQueue('job-1', 'system', 'db_backup', { dbType: 'mongodb' });

    expect(state.queueConfig).toMatchObject({
      name: 'product-ai',
      concurrency: 1,
    });
    expect(mocks.queue.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.queue.enqueue).toHaveBeenCalledWith(
      {
        jobId: 'job-1',
        productId: 'system',
        type: 'db_backup',
        payload: { dbType: 'mongodb' },
      },
      { jobId: 'job-1' }
    );
  });

  it('requeues pending and stale running backup jobs on queue startup', async () => {
    mocks.repository.findJobs
      .mockResolvedValueOnce([buildRecord({ id: 'pending-1' })])
      .mockResolvedValueOnce([
        buildRecord({
          id: 'stale-running-1',
          status: 'running',
          startedAt: new Date('2026-05-07T09:40:00.000Z'),
        }),
      ]);

    startProductAiJobQueue();

    await vi.waitFor(() => {
      expect(mocks.queue.enqueue).toHaveBeenCalledTimes(2);
    });
    expect(mocks.queue.enqueue).toHaveBeenNthCalledWith(
      1,
      {
        jobId: 'pending-1',
        productId: 'system',
        type: 'db_backup',
        payload: { dbType: 'mongodb' },
      },
      { jobId: 'pending-1' }
    );
    expect(mocks.queue.enqueue).toHaveBeenNthCalledWith(
      2,
      {
        jobId: 'stale-running-1',
        productId: 'system',
        type: 'db_backup',
        payload: { dbType: 'mongodb' },
      },
      { jobId: 'stale-running-1' }
    );
  });

  it('processes managed backup payloads from the queue processor', async () => {
    mocks.repository.findJobById.mockResolvedValue(
      buildRecord({ payload: { dbType: 'mongodb', application: 'studiq' } })
    );

    await expect(
      state.queueConfig?.processor(
        {
          jobId: 'job-1',
          productId: 'system',
          type: 'db_backup',
          payload: { dbType: 'mongodb', application: 'studiq' },
        },
        'bull-job-1'
      )
    ).resolves.toMatchObject({
      id: 'job-1',
      status: 'completed',
    });

    expect(mocks.markDatabaseBackupJobRunning).toHaveBeenCalledWith('mongodb', 'job-1');
    expect(mocks.createMongoManagedBackup).toHaveBeenCalledWith('studiq');
    expect(mocks.createMongoBackup).not.toHaveBeenCalled();
    expect(mocks.markDatabaseBackupJobSucceeded).toHaveBeenCalledWith('mongodb', 'job-1');
    expect(mocks.repository.updateJob).toHaveBeenLastCalledWith(
      'job-1',
      expect.objectContaining({
        status: 'completed',
        result: expect.objectContaining({
          backupName: 'studiq/studiq.archive',
          dbType: 'mongodb',
        }),
      })
    );
  });

  it('reports queue health with repository-backed pending and running counts', async () => {
    mocks.repository.findJobs
      .mockResolvedValueOnce([buildRecord({ id: 'pending-1' })])
      .mockResolvedValueOnce([buildRecord({ id: 'running-1', status: 'running' })]);

    await expect(getQueueStatus()).resolves.toMatchObject({
      name: 'product-ai',
      deliveryMode: 'queue',
      redisAvailable: true,
      waitingCount: 1,
      activeCount: 1,
      repositoryPendingCount: 1,
      repositoryRunningCount: 1,
    });
  });
});
