import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createManagedQueueMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: createManagedQueueMock,
}));
vi.mock('@/features/product-sync/services/product-sync-service', () => ({
  runBaseListingBackfill: vi.fn(),
}));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: vi.fn(),
    captureException: vi.fn(),
  },
}));

describe('productSyncBackfillQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T10:30:45.000Z'));

    enqueueMock.mockReset().mockResolvedValue('queued-job-2');
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

  it('builds a BullMQ-safe custom job id when enqueueing backfill jobs', async () => {
    const module = await import('./productSyncBackfillQueue');
    const expectedBucket = Math.floor(Date.now() / 30_000);

    await expect(
      module.enqueueProductSyncBackfillJob({
        connectionId: 'connection:1',
        catalogId: 'catalog:1',
      })
    ).resolves.toBe('queued-job-2');

    expect(enqueueMock).toHaveBeenCalledWith(
      {
        connectionId: 'connection:1',
        catalogId: 'catalog:1',
      },
      {
        jobId: `product-sync-backfill__${expectedBucket}__connection%3A1__catalog%3A1`,
      }
    );
  });
});
