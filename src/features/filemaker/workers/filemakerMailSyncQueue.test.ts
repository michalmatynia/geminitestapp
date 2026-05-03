import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueue: vi.fn(),
  isRedisAvailable: vi.fn(() => true),
  enqueue: vi.fn(),
  processInline: vi.fn(),
  startWorker: vi.fn(),
  stopWorker: vi.fn(),
  syncFilemakerMailAccount: vi.fn(),
  logSystemEvent: vi.fn(async () => undefined),
  captureException: vi.fn(async () => undefined),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: mocks.createManagedQueue,
  isRedisAvailable: mocks.isRedisAvailable,
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
  syncFilemakerMailAccount: mocks.syncFilemakerMailAccount,
}));

const loadModule = async () => import('./filemakerMailSyncQueue');

describe('filemakerMailSyncQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.isRedisAvailable.mockReturnValue(true);
    mocks.enqueue.mockResolvedValue('job-1');
    mocks.processInline.mockResolvedValue(undefined);
    mocks.createManagedQueue.mockReturnValue({
      enqueue: mocks.enqueue,
      processInline: mocks.processInline,
      startWorker: mocks.startWorker,
      stopWorker: mocks.stopWorker,
    });
    mocks.syncFilemakerMailAccount.mockResolvedValue({
      accountId: 'account-1',
      foldersScanned: ['INBOX'],
      fetchedMessageCount: 2,
      insertedMessageCount: 1,
      updatedMessageCount: 1,
      touchedThreadCount: 1,
      completedAt: '2026-04-24T10:00:00.000Z',
      lastSyncError: null,
    });
  });

  it('enqueues a BullMQ sync job when Redis is available', async () => {
    const module = await loadModule();

    const dispatch = await module.enqueueFilemakerMailSyncJob({
      accountId: 'account 1',
      reason: 'manual',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });

    expect(mocks.enqueue).toHaveBeenCalledWith(
      {
        accountId: 'account 1',
        reason: 'manual',
        requestedAt: '2026-04-24T10:00:00.000Z',
      },
      {
        jobId: expect.stringContaining('account%201'),
      }
    );
    expect(dispatch).toEqual({
      accountId: 'account 1',
      dispatchMode: 'queued',
      jobId: 'job-1',
      reason: 'manual',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
  });

  it('starts inline background sync when Redis is unavailable', async () => {
    mocks.isRedisAvailable.mockReturnValue(false);
    const module = await loadModule();

    const dispatch = await module.enqueueFilemakerMailSyncJob({
      accountId: 'account-1',
      reason: 'idle',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });

    expect(mocks.enqueue).not.toHaveBeenCalled();
    expect(mocks.processInline).toHaveBeenCalledWith({
      accountId: 'account-1',
      reason: 'idle',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
    expect(dispatch).toEqual({
      accountId: 'account-1',
      dispatchMode: 'inline',
      jobId: null,
      reason: 'idle',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
  });

  it('runs account synchronization inside the queue processor', async () => {
    await loadModule();
    const queueConfig = mocks.createManagedQueue.mock.calls[0]?.[0] as {
      processor: (
        data: { accountId: string; reason: string; requestedAt: string },
        jobId: string,
        signal?: AbortSignal,
        context?: { updateProgress: (progress: unknown) => Promise<void> }
      ) => Promise<unknown>;
    };
    const updateProgress = vi.fn(async () => undefined);

    const result = await queueConfig.processor(
      {
        accountId: 'account-1',
        reason: 'scheduler',
        requestedAt: '2026-04-24T10:00:00.000Z',
      },
      'job-1',
      undefined,
      { updateProgress }
    );

    expect(mocks.syncFilemakerMailAccount).toHaveBeenCalledWith('account-1');
    expect(updateProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        fetchedMessageCount: 2,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        accountId: 'account-1',
        jobId: 'job-1',
      })
    );
  });
});
