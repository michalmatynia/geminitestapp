/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDatabaseEngineBackupScheduleMock,
  invalidateDatabaseEnginePolicyCacheMock,
  getMongoDbMock,
  enqueueProductAiJobMock,
  getRegisteredQueueMock,
  captureExceptionMock,
  logWarningMock,
} = vi.hoisted(() => ({
  getDatabaseEngineBackupScheduleMock: vi.fn(),
  invalidateDatabaseEnginePolicyCacheMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  enqueueProductAiJobMock: vi.fn(),
  getRegisteredQueueMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineBackupSchedule: getDatabaseEngineBackupScheduleMock,
  invalidateDatabaseEnginePolicyCache: invalidateDatabaseEnginePolicyCacheMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/products/services/productAiService', () => ({
  enqueueProductAiJob: enqueueProductAiJobMock,
}));

vi.mock('@/shared/lib/queue', () => ({
  getRegisteredQueue: getRegisteredQueueMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
    logWarning: logWarningMock,
  },
}));

import {
  evaluateBackupTargetSchedule,
  getDatabaseBackupSchedulerStatus,
  tickDatabaseBackupScheduler,
} from './database-backup-scheduler';

describe('database-backup-scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRegisteredQueueMock.mockReturnValue(undefined);
  });

  it('keeps disabled targets out of the due-now state', () => {
    const evaluation = evaluateBackupTargetSchedule(
      {
        enabled: false,
        cadence: 'daily',
        intervalDays: 3,
        weekday: 1,
        timeUtc: '02:00',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: '2026-03-22T02:00:00.000Z',
      },
      new Date('2026-03-22T10:00:00.000Z')
    );

    expect(evaluation).toEqual({
      dueNow: false,
      nextDueAt: '2026-03-22T02:00:00.000Z',
    });
  });

  it('computes first and subsequent due times for active schedules', () => {
    const firstDue = evaluateBackupTargetSchedule(
      {
        enabled: true,
        cadence: 'weekly',
        intervalDays: 3,
        weekday: 6,
        timeUtc: '12:30',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: null,
      },
      new Date('2026-03-21T10:00:00.000Z')
    );
    const repeatDue = evaluateBackupTargetSchedule(
      {
        enabled: true,
        cadence: 'every_n_days',
        intervalDays: 2,
        weekday: 1,
        timeUtc: '02:00',
        lastQueuedAt: '2026-03-19T02:00:00.000Z',
        lastRunAt: null,
        lastStatus: 'success',
        lastJobId: 'job-1',
        lastError: null,
        nextDueAt: null,
      },
      new Date('2026-03-21T02:01:00.000Z')
    );

    expect(firstDue).toEqual({
      dueNow: false,
      nextDueAt: '2026-03-21T12:30:00.000Z',
    });
    expect(repeatDue).toEqual({
      dueNow: true,
      nextDueAt: '2026-03-21T02:00:00.000Z',
    });
  });

  it('projects scheduler status with due-now metadata for the configured target', async () => {
    getDatabaseEngineBackupScheduleMock.mockResolvedValue({
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: '2026-03-21T09:00:00.000Z',
      mongodb: {
        enabled: true,
        cadence: 'daily',
        intervalDays: 1,
        weekday: 1,
        timeUtc: '08:00',
        lastQueuedAt: '2026-03-20T08:00:00.000Z',
        lastRunAt: '2026-03-20T08:00:00.000Z',
        lastStatus: 'success',
        lastJobId: 'job-1',
        lastError: null,
        nextDueAt: null,
      },
    });

    const status = await getDatabaseBackupSchedulerStatus(
      new Date('2026-03-21T09:30:00.000Z')
    );

    expect(status).toMatchObject({
      timestamp: '2026-03-21T09:30:00.000Z',
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: '2026-03-21T09:00:00.000Z',
      targets: {
        mongodb: expect.objectContaining({
          dueNow: true,
          nextDueAt: '2026-03-21T08:00:00.000Z',
          lastStatus: 'success',
        }),
      },
    });
  });

  it('enqueues due backups through the registered product-ai runtime queue', async () => {
    const queue = {
      enqueue: vi.fn().mockResolvedValue('bull-job-1'),
      processInline: vi.fn(),
      startWorker: vi.fn(),
    };
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn(() => ({ updateOne }));
    getRegisteredQueueMock.mockReturnValue(queue);
    getMongoDbMock.mockResolvedValue({ collection });
    enqueueProductAiJobMock.mockResolvedValue({
      id: 'job-mongo-1',
      productId: 'system',
      type: 'db_backup',
      jobType: 'db_backup',
      payload: {
        dbType: 'mongodb',
        entityType: 'system',
        source: 'database_backup_scheduler',
      },
    });
    getDatabaseEngineBackupScheduleMock.mockResolvedValue({
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: null,
      mongodb: {
        enabled: true,
        cadence: 'daily',
        intervalDays: 1,
        weekday: 1,
        timeUtc: '08:00',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: null,
      },
    });

    const result = await tickDatabaseBackupScheduler(new Date('2026-03-21T09:30:00.000Z'));

    expect(result.triggered).toEqual([{ dbType: 'mongodb', jobId: 'job-mongo-1' }]);
    expect(queue.startWorker).toHaveBeenCalledTimes(1);
    expect(queue.enqueue).toHaveBeenCalledWith({
      jobId: 'job-mongo-1',
      productId: 'system',
      type: 'db_backup',
      payload: {
        dbType: 'mongodb',
        entityType: 'system',
        source: 'database_backup_scheduler',
      },
    });
    expect(queue.processInline).not.toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it('marks due backups failed instead of leaving them pending when the runtime queue is missing', async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const collection = vi.fn(() => ({ updateOne }));
    getMongoDbMock.mockResolvedValue({ collection });
    enqueueProductAiJobMock.mockResolvedValue({
      id: 'job-mongo-1',
      productId: 'system',
      type: 'db_backup',
      jobType: 'db_backup',
      payload: {
        dbType: 'mongodb',
        entityType: 'system',
        source: 'database_backup_scheduler',
      },
    });
    getDatabaseEngineBackupScheduleMock.mockResolvedValue({
      schedulerEnabled: true,
      repeatTickEnabled: false,
      lastCheckedAt: null,
      mongodb: {
        enabled: true,
        cadence: 'daily',
        intervalDays: 1,
        weekday: 1,
        timeUtc: '08:00',
        lastQueuedAt: null,
        lastRunAt: null,
        lastStatus: 'idle',
        lastJobId: null,
        lastError: null,
        nextDueAt: null,
      },
    });

    const result = await tickDatabaseBackupScheduler(new Date('2026-03-21T09:30:00.000Z'));

    expect(result.triggered).toEqual([]);
    expect(result.skipped).toEqual([{ dbType: 'mongodb', reason: 'enqueue_failed' }]);
    expect(logWarningMock).toHaveBeenCalledWith(
      '[database-backup-scheduler] product-ai queue not found in registry',
      expect.objectContaining({
        jobId: 'job-mongo-1',
        service: 'database-backup-scheduler',
      })
    );
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith(
      { key: expect.stringContaining('database_engine_backup_schedule') },
      expect.objectContaining({
        $set: expect.objectContaining({
          value: expect.stringContaining('"lastStatus":"failed"'),
        }),
      }),
      { upsert: true }
    );
  });
});
