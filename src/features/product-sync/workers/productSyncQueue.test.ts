import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createManagedQueueMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
}));
vi.mock('@/features/product-sync/services/product-sync-service', () => ({
  processProductSyncRun: vi.fn(),
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: vi.fn(),
    captureException: vi.fn(),
  },
}));

describe('productSyncQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T10:30:45.000Z'));

    enqueueMock.mockReset().mockResolvedValue('queued-job-1');
    createManagedQueueMock.mockReset().mockReturnValue({
      startWorker: vi.fn(),
      stopWorker: vi.fn(),
      enqueue: enqueueMock,
      getHealthStatus: vi.fn(),
      getQueue: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a BullMQ-safe custom job id when enqueueing product sync runs', async () => {
    const module = await import('./productSyncQueue');
    const expectedBucket = Math.floor(Date.now() / 10_000);

    await expect(
      module.enqueueProductSyncRunJob({
        runId: 'run:1',
        profileId: 'profile:1',
        trigger: 'manual',
      })
    ).resolves.toBe('queued-job-1');

    expect(enqueueMock).toHaveBeenCalledWith(
      {
        runId: 'run:1',
        profileId: 'profile:1',
        trigger: 'manual',
      },
      {
        jobId: `profile%3A1__run%3A1__manual__${expectedBucket}`,
      }
    );
  });
});
