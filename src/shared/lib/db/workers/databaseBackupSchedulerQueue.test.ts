import { beforeEach, describe, expect, it, vi } from 'vitest';

const createManagedQueueMock = vi.hoisted(() => vi.fn());
const getDatabaseEngineBackupScheduleMock = vi.hoisted(() => vi.fn());
const tickDatabaseBackupSchedulerMock = vi.hoisted(() => vi.fn());
const captureExceptionMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

const startWorkerMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());
const getHealthStatusMock = vi.hoisted(() => vi.fn());
const getQueueMock = vi.hoisted(() => vi.fn());
const removeRepeatableMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
}));
vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEngineBackupSchedule: getDatabaseEngineBackupScheduleMock,
}));
vi.mock('@/shared/lib/db/services/database-backup-scheduler', () => ({
  tickDatabaseBackupScheduler: tickDatabaseBackupSchedulerMock,
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

const loadModule = async () =>
  import('@/shared/lib/db/workers/databaseBackupSchedulerQueue');

describe('databaseBackupSchedulerQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env['DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS'];
    delete process.env['DATABASE_BACKUP_SCHEDULER_LOCK_DURATION_MS'];
    delete (globalThis as typeof globalThis & {
      __databaseBackupSchedulerQueueState__?: unknown;
    }).__databaseBackupSchedulerQueueState__;

    startWorkerMock.mockReset();
    enqueueMock.mockReset().mockResolvedValue(undefined);
    getHealthStatusMock.mockReset().mockResolvedValue({});
    getQueueMock.mockReset().mockReturnValue({
      removeRepeatable: removeRepeatableMock,
    });
    removeRepeatableMock.mockReset().mockResolvedValue(undefined);
    createManagedQueueMock.mockReset().mockReturnValue({
      startWorker: startWorkerMock,
      enqueue: enqueueMock,
      getHealthStatus: getHealthStatusMock,
      getQueue: getQueueMock,
    });
    getDatabaseEngineBackupScheduleMock.mockReset().mockResolvedValue({
      repeatTickEnabled: true,
    });
    tickDatabaseBackupSchedulerMock.mockReset().mockResolvedValue(undefined);
    captureExceptionMock.mockReset().mockResolvedValue(undefined);
  });

  it('starts the worker, queues startup/repeat ticks, unregisters repeats when disabled, and maps queue status', async () => {
    const module = await loadModule();

    expect(module.DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS).toBe(60_000);

    module.startDatabaseBackupSchedulerQueue();

    await vi.waitFor(() => {
      expect(startWorkerMock).toHaveBeenCalledTimes(1);
      expect(enqueueMock).toHaveBeenCalledTimes(2);
    });

    expect(enqueueMock).toHaveBeenNthCalledWith(
      1,
      { type: 'scheduled-tick' },
      {
        jobId: 'database-backup-scheduler-startup-tick',
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
    expect(enqueueMock).toHaveBeenNthCalledWith(
      2,
      { type: 'scheduled-tick' },
      {
        repeat: { every: 60_000 },
        jobId: 'database-backup-scheduler-tick',
      }
    );

    getHealthStatusMock.mockResolvedValue({
      running: true,
      healthy: true,
      processing: false,
      activeCount: 1,
      waitingCount: 2,
      failedCount: 3,
      completedCount: 4,
      lastPollTime: 123,
      timeSinceLastPoll: 456,
    });

    await expect(module.getDatabaseBackupSchedulerQueueStatus()).resolves.toEqual({
      running: true,
      healthy: true,
      processing: false,
      activeJobs: 1,
      waitingJobs: 2,
      failedJobs: 3,
      completedJobs: 4,
      lastPollTime: 123,
      timeSinceLastPoll: 456,
    });

    getDatabaseEngineBackupScheduleMock.mockResolvedValue({
      repeatTickEnabled: false,
    });

    module.startDatabaseBackupSchedulerQueue();

    await vi.waitFor(() => {
      expect(removeRepeatableMock).toHaveBeenCalledWith(
        'database-backup-scheduler',
        { every: 60_000 },
        'database-backup-scheduler-tick'
      );
    });

    expect(startWorkerMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenCalledTimes(2);
  });

  it('clamps repeat interval env values and retries startup ticks after enqueue failures', async () => {
    process.env['DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS'] = '1000';

    const startupError = new Error('startup failed');
    enqueueMock
      .mockRejectedValueOnce(startupError)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const module = await loadModule();

    expect(module.DATABASE_BACKUP_SCHEDULER_REPEAT_EVERY_MS).toBe(30_000);

    module.startDatabaseBackupSchedulerQueue();

    await vi.waitFor(() => {
      expect(captureExceptionMock).toHaveBeenCalledWith(startupError, {
        service: 'database-backup-scheduler-queue',
        action: 'enqueueStartupTick',
      });
    });

    module.startDatabaseBackupSchedulerQueue();

    await vi.waitFor(() => {
      expect(enqueueMock).toHaveBeenCalledTimes(3);
    });

    expect(startWorkerMock).toHaveBeenCalledTimes(1);
    expect(enqueueMock).toHaveBeenNthCalledWith(
      2,
      { type: 'scheduled-tick' },
      {
        repeat: { every: 30_000 },
        jobId: 'database-backup-scheduler-tick',
      }
    );
    expect(enqueueMock).toHaveBeenNthCalledWith(
      3,
      { type: 'scheduled-tick' },
      {
        jobId: 'database-backup-scheduler-startup-tick',
        removeOnComplete: true,
        removeOnFail: true,
      }
    );
  });
});
