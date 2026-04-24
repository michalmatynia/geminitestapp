import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueue: vi.fn(),
  enqueue: vi.fn(),
  startWorker: vi.fn(),
  listFilemakerMailAccounts: vi.fn(),
  enqueueFilemakerMailSyncJob: vi.fn(),
  startFilemakerMailSyncQueue: vi.fn(),
  logSystemEvent: vi.fn(async () => undefined),
  captureException: vi.fn(async () => undefined),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: mocks.createManagedQueue,
}));
vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: mocks.logSystemEvent,
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));
vi.mock('@/features/filemaker/server/filemaker-mail-service', () => ({
  listFilemakerMailAccounts: mocks.listFilemakerMailAccounts,
}));
vi.mock('@/features/filemaker/workers/filemakerMailSyncQueue', () => ({
  enqueueFilemakerMailSyncJob: mocks.enqueueFilemakerMailSyncJob,
  startFilemakerMailSyncQueue: mocks.startFilemakerMailSyncQueue,
}));

const loadModule = async () => import('./filemakerMailSyncSchedulerQueue');

describe('filemakerMailSyncSchedulerQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-24T10:00:00.000Z'));
    process.env = { ...originalEnv };
    delete process.env['DISABLE_FILEMAKER_MAIL_SYNC_SCHEDULER'];
    delete (globalThis as typeof globalThis & {
      __filemakerMailSyncSchedulerQueueState__?: unknown;
    }).__filemakerMailSyncSchedulerQueueState__;
    mocks.enqueue.mockResolvedValue('scheduler-job-1');
    mocks.createManagedQueue.mockReturnValue({
      enqueue: mocks.enqueue,
      startWorker: mocks.startWorker,
    });
    mocks.listFilemakerMailAccounts.mockResolvedValue([
      { id: 'active-1', status: 'active' },
      { id: 'paused-1', status: 'paused' },
      { id: 'active-2', status: 'active' },
    ]);
    mocks.enqueueFilemakerMailSyncJob.mockResolvedValue({
      accountId: 'active-1',
      dispatchMode: 'queued',
      jobId: 'job-1',
      reason: 'scheduler',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  it('registers the scheduler and starts the sync worker once', async () => {
    const module = await loadModule();

    module.startFilemakerMailSyncSchedulerQueue();
    module.startFilemakerMailSyncSchedulerQueue();

    expect(mocks.startFilemakerMailSyncQueue).toHaveBeenCalledTimes(1);
    expect(mocks.startWorker).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith(
      { type: 'scheduled-tick' },
      {
        repeat: { every: module.FILEMAKER_MAIL_SYNC_SCHEDULER_REPEAT_EVERY_MS },
        jobId: 'filemaker-mail-sync-scheduler-tick',
      }
    );
  });

  it('enqueues per-account sync jobs for active accounts during a tick', async () => {
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: () => Promise<unknown>;
    };

    const result = await queueConfig.processor();

    expect(mocks.startFilemakerMailSyncQueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueFilemakerMailSyncJob).toHaveBeenCalledTimes(2);
    expect(mocks.enqueueFilemakerMailSyncJob).toHaveBeenNthCalledWith(1, {
      accountId: 'active-1',
      reason: 'scheduler',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
    expect(mocks.enqueueFilemakerMailSyncJob).toHaveBeenNthCalledWith(2, {
      accountId: 'active-2',
      reason: 'scheduler',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
    expect(result).toEqual({ attempted: 2, enqueued: 2, failed: 0 });
  });
});
