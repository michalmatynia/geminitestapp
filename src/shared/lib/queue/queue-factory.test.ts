import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  queueInstances,
  queueAddImpls,
  workerInstances,
  MockQueue,
  MockWorker,
  getRedisConnectionMock,
  registerQueueMock,
  captureExceptionMock,
  logSystemEventMock,
} = vi.hoisted(() => {
  const queueInstances: any[] = [];
  const queueAddImpls: Array<((...args: any[]) => Promise<unknown>) | undefined> = [];
  const workerInstances: any[] = [];

  class MockQueue {
    name: string;
    options: Record<string, unknown>;
    handlers: Record<string, (...args: any[]) => unknown> = {};
    add: ReturnType<typeof vi.fn>;
    close = vi.fn(async () => {});
    getJobCounts = vi.fn(async () => ({
      active: 0,
      waiting: 0,
      failed: 0,
      completed: 0,
    }));

    constructor(name: string, options: Record<string, unknown>) {
      this.name = name;
      this.options = options;
      const nextAddImpl = queueAddImpls.shift();
      this.add = vi.fn(
        nextAddImpl ??
          (async () => ({
            id: 'mock-job-id',
          }))
      );
      queueInstances.push(this);
    }

    on(event: string, handler: (...args: any[]) => unknown) {
      this.handlers[event] = handler;
      return this;
    }
  }

  class MockWorker {
    name: string;
    processor: (...args: any[]) => Promise<unknown>;
    options: Record<string, unknown>;
    handlers: Record<string, (...args: any[]) => unknown> = {};
    close = vi.fn(async () => {});

    constructor(
      name: string,
      processor: (...args: any[]) => Promise<unknown>,
      options: Record<string, unknown>
    ) {
      this.name = name;
      this.processor = processor;
      this.options = options;
      workerInstances.push(this);
    }

    on(event: string, handler: (...args: any[]) => unknown) {
      this.handlers[event] = handler;
      return this;
    }
  }

  return {
    queueInstances,
    queueAddImpls,
    workerInstances,
    MockQueue,
    MockWorker,
    getRedisConnectionMock: vi.fn(),
    registerQueueMock: vi.fn(),
    captureExceptionMock: vi.fn(),
    logSystemEventMock: vi.fn(async () => {}),
  };
});

vi.mock('server-only', () => ({}));

vi.mock('bullmq', () => ({
  Queue: MockQueue,
  Worker: MockWorker,
}));

vi.mock('./redis-connection', () => ({
  getRedisConnection: getRedisConnectionMock,
}));

vi.mock('./registry', () => ({
  registerQueue: registerQueueMock,
}));

vi.mock('../observability/system-logger', () => ({
  logSystemEvent: (...args: unknown[]) => logSystemEventMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { createManagedQueue } from './queue-factory';

describe('queue-factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queueInstances.length = 0;
    queueAddImpls.length = 0;
    workerInstances.length = 0;
    getRedisConnectionMock.mockReturnValue({ host: 'redis' });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('falls back to inline processing when redis is unavailable', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1234);
    getRedisConnectionMock.mockReturnValue(null);
    const processor = vi.fn(async () => 'inline-result');

    const managed = createManagedQueue({
      name: 'inline-queue',
      concurrency: 2,
      processor,
    });

    await expect(managed.enqueue({ ok: true })).resolves.toBe('inline-1234');
    expect(processor).toHaveBeenCalledWith(
      { ok: true },
      'inline-1234',
      undefined,
      expect.objectContaining({ updateProgress: expect.any(Function) })
    );

    managed.startWorker();
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'queue-factory',
        message: '[queue-factory:inline-queue] Redis not available, using inline processing mode',
      })
    );

    await expect(managed.getHealthStatus()).resolves.toEqual({
      deliveryMode: 'inline',
      workerState: 'inline',
      statusReason: 'missing_redis',
      redisAvailable: false,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
    expect(registerQueueMock).toHaveBeenCalledWith('inline-queue', expect.any(Object));
  });

  it('creates bull queues with default options and enqueues jobs with repeat and job ids', async () => {
    const managed = createManagedQueue({
      name: 'redis-queue',
      concurrency: 3,
      defaultJobOptions: { attempts: 5 },
      processor: vi.fn(async () => 'ok'),
    });

    queueAddImpls.push(async () => ({ id: 'queued-1' }));

    const enqueuePromise = managed.enqueue(
      { sku: 'SKU-1' },
      { repeat: { every: 5000 }, jobId: 'job-1', priority: 4 }
    );
    const queue = queueInstances[0];
    expect(queue.options).toEqual(
      expect.objectContaining({
        connection: { host: 'redis' },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 5,
        },
      })
    );

    await expect(enqueuePromise).resolves.toBe('queued-1');
    expect(queue.add).toHaveBeenCalledWith('redis-queue', { sku: 'SKU-1' }, {
      priority: 4,
      repeat: { every: 5000 },
      jobId: 'job-1',
    });
    expect(managed.getQueue()).toBe(queue);
  });

  it('logs transient queue errors once per cooldown window and captures fatal queue errors', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(40_000);
    const managed = createManagedQueue({
      name: 'error-queue',
      concurrency: 1,
      processor: vi.fn(async () => null),
    });
    queueAddImpls.push(async () => ({ id: 'queued-err' }));
    await managed.enqueue({ value: 1 });
    const queue = queueInstances[0];

    const transient = new Error('write EPIPE');
    (transient as NodeJS.ErrnoException).code = 'EPIPE';
    queue.handlers.error(transient);
    queue.handlers.error(transient);
    await Promise.resolve();

    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        source: 'queue-factory',
        message: '[queue-factory:error-queue] transient queue transport error: write EPIPE',
      })
    );

    const fatal = new Error('fatal queue failure');
    queue.handlers.error(fatal);
    await Promise.resolve();

    expect(captureExceptionMock).toHaveBeenCalledWith(fatal, {
      service: 'queue:error-queue',
      category: 'SYSTEM',
    });
  });

  it('captures enqueue failures and rethrows them', async () => {
    const managed = createManagedQueue({
      name: 'enqueue-failure',
      concurrency: 1,
      processor: vi.fn(async () => null),
    });
    const error = new Error('cannot enqueue');
    queueAddImpls.push(async () => {
      throw error;
    });

    await expect(managed.enqueue({ value: 1 }, { jobId: 'job-x' })).rejects.toThrow('cannot enqueue');
    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      service: 'queue:enqueue-failure',
      category: 'SYSTEM',
      action: 'enqueue',
      jobId: 'job-x',
    });
  });

  it('starts workers, exposes health, and forwards completed/failed hooks', async () => {
    const processor = vi.fn(async (_data: { task: string }, _jobId: string, _signal?: AbortSignal, helpers?: { updateProgress: (progress: unknown) => Promise<void> }) => {
      await helpers?.updateProgress({ step: 'done' });
      return { ok: true };
    });
    const onCompleted = vi.fn(async () => {});
    const onFailed = vi.fn(async () => {});

    const managed = createManagedQueue({
      name: 'worker-queue',
      concurrency: 4,
      jobTimeoutMs: 1000,
      processor,
      onCompleted,
      onFailed,
    });

    managed.startWorker();
    const worker = workerInstances[0];
    expect(worker.options).toEqual(
      expect.objectContaining({
        connection: { host: 'redis' },
        concurrency: 4,
        lockDuration: 61_000,
        removeOnComplete: { count: 0 },
        removeOnFail: { count: 100 },
      })
    );

    const job = {
      id: 'job-42',
      data: { task: 'index' },
      opts: { attempts: 3 },
      attemptsMade: 2,
      updateProgress: vi.fn(async () => {}),
    };

    await expect(worker.processor(job)).resolves.toEqual({ ok: true });
    expect(job.updateProgress).toHaveBeenCalledWith({ step: 'done' });

    await expect(managed.getHealthStatus()).resolves.toEqual(
      expect.objectContaining({
        deliveryMode: 'queue',
        workerState: 'idle',
        redisAvailable: true,
        workerLocal: true,
        running: true,
        healthy: true,
        processing: false,
        activeCount: 0,
        waitingCount: 0,
        failedCount: 0,
        completedCount: 0,
      })
    );

    const queue = queueInstances[0];

    await worker.handlers.completed(job, { ok: true });
    expect(onCompleted).toHaveBeenCalledWith('job-42', { ok: true }, { task: 'index' });

    await worker.handlers.failed(job, new Error('job failed'));
    expect(onFailed).toHaveBeenCalledWith(
      'job-42',
      expect.any(Error),
      { task: 'index' },
      { attemptsMade: 2, maxAttempts: 3 }
    );

    await managed.stopWorker();
    expect(worker.close).toHaveBeenCalled();
    expect(queue.close).toHaveBeenCalled();
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'queue-factory',
        message: '[queue-factory:worker-queue] Worker stopped',
      })
    );
  });

  it('aborts timed-out jobs and handles worker transient/fatal errors separately', async () => {
    vi.useFakeTimers();
    const processor = vi.fn(
      async (_data: { task: string }, _jobId: string, signal?: AbortSignal) =>
        await new Promise((_, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason));
        })
    );

    const managed = createManagedQueue({
      name: 'timeout-queue',
      concurrency: 1,
      jobTimeoutMs: 50,
      processor,
    });

    managed.startWorker();
    const worker = workerInstances[0];
    expect(worker.options.lockDuration).toBe(60_050);

    const job = {
      id: 'job-timeout',
      data: { task: 'wait' },
      opts: { attempts: 1 },
      attemptsMade: 1,
      updateProgress: vi.fn(async () => {}),
    };

    const execution = expect(worker.processor(job)).rejects.toThrow(
      'Job job-timeout timed out after 50 ms'
    );
    await vi.advanceTimersByTimeAsync(50);
    await execution;

    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        source: 'queue:timeout-queue',
        message: '[queue-factory:timeout-queue] job job-timeout timed out after 50ms',
      })
    );

    const transient = new Error('connection is closed');
    worker.handlers.error(transient);
    await Promise.resolve();
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        source: 'queue-factory',
        message:
          '[queue-factory:timeout-queue] transient worker transport error: connection is closed',
      })
    );

    const fatal = new Error('fatal worker failure');
    worker.handlers.error(fatal);
    await Promise.resolve();
    expect(captureExceptionMock).toHaveBeenCalledWith(fatal, {
      service: 'queue-worker:timeout-queue',
      category: 'SYSTEM',
    });
  });

  it('reports redis-backed queues as idle when shared queue activity exists but no local worker is active', async () => {
    const managed = createManagedQueue({
      name: 'idle-queue',
      concurrency: 1,
      processor: vi.fn(async () => null),
    });

    await managed.enqueue({ value: 'seed' });
    const queue = queueInstances[0];
    queue.getJobCounts.mockResolvedValue({
      active: 0,
      waiting: 0,
      failed: 0,
      completed: 3,
    });

    await expect(managed.getHealthStatus()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'idle',
      statusReason: undefined,
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: true,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 3,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
  });

  it('reports redis-backed queues as offline before any worker or queue activity is observed', async () => {
    const managed = createManagedQueue({
      name: 'offline-queue',
      concurrency: 1,
      processor: vi.fn(async () => null),
    });

    await expect(managed.getHealthStatus()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'offline',
      statusReason: 'worker_inactive',
      redisAvailable: true,
      workerLocal: false,
      running: false,
      healthy: false,
      processing: false,
      activeCount: 0,
      waitingCount: 0,
      failedCount: 0,
      completedCount: 0,
      lastPollTime: 0,
      timeSinceLastPoll: 0,
    });
  });

  it('uses worker-option lock durations when no job timeout is configured and startWorker is idempotent', async () => {
    const managed = createManagedQueue({
      name: 'lock-queue',
      concurrency: 2,
      workerOptions: { lockDuration: 45_000 },
      processor: vi.fn(async () => 'done'),
    });

    managed.startWorker();
    managed.startWorker();

    expect(workerInstances).toHaveLength(1);
    expect(workerInstances[0]?.options).toEqual(
      expect.objectContaining({
        lockDuration: 45_000,
      })
    );
  });

  it('returns fallback queue ids and treats message-only transport errors as transient', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(40_000);

    const managed = createManagedQueue({
      name: 'cooldown-queue',
      concurrency: 1,
      processor: vi.fn(async () => null),
    });
    queueAddImpls.push(async () => ({ id: null }));

    await expect(managed.enqueue({ value: 1 })).resolves.toBe('unknown-40000');
    const queue = queueInstances[0];

    const transient = new Error('socket closed unexpectedly');
    queue.handlers.error(transient);
    await Promise.resolve();

    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        message:
          '[queue-factory:cooldown-queue] transient queue transport error: socket closed unexpectedly',
      })
    );
  });

  it('normalizes failure attempt metadata and ignores failed callbacks without a job payload', async () => {
    const onFailed = vi.fn(async () => {});
    const managed = createManagedQueue({
      name: 'failure-queue',
      concurrency: 1,
      processor: vi.fn(async () => null),
      onFailed,
    });

    managed.startWorker();
    const worker = workerInstances[0];

    await worker.handlers.failed(
      {
        id: 'job-7',
        data: { task: 'sync' },
        opts: { attempts: 0 },
        attemptsMade: 0,
      },
      new Error('nope')
    );
    await worker.handlers.failed(undefined, new Error('ignored'));

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(
      'job-7',
      expect.any(Error),
      { task: 'sync' },
      { attemptsMade: 1, maxAttempts: 1 }
    );
  });

  it('tracks running health and last-process timestamps when an active worker is processing queue jobs', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(50_000).mockReturnValueOnce(50_500);

    const processor = vi.fn(async () => 'processed');
    const managed = createManagedQueue({
      name: 'active-queue',
      concurrency: 1,
      processor,
    });

    managed.startWorker();
    await managed.enqueue({ task: 'seed' });
    const worker = workerInstances[0];
    const queue = queueInstances[0];
    queue.getJobCounts.mockResolvedValue({
      active: 2,
      waiting: 1,
      failed: 0,
      completed: 4,
    });

    await expect(
      worker.processor({
        id: 'job-active',
        data: { task: 'run' },
        updateProgress: vi.fn(async () => {}),
      })
    ).resolves.toBe('processed');

    await expect(managed.getHealthStatus()).resolves.toEqual({
      deliveryMode: 'queue',
      workerState: 'running',
      statusReason: undefined,
      redisAvailable: true,
      workerLocal: true,
      running: true,
      healthy: true,
      processing: true,
      activeCount: 2,
      waitingCount: 1,
      failedCount: 0,
      completedCount: 4,
      lastPollTime: 50_000,
      timeSinceLastPoll: 500,
    });
    expect(processor).toHaveBeenCalledWith({ task: 'run' }, 'job-active');
  });
});
