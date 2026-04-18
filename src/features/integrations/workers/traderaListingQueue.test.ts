import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createManagedQueueMock: vi.fn(),
  queueMock: {
    startWorker: vi.fn(),
    stopWorker: vi.fn(),
    enqueue: vi.fn(),
    getHealthStatus: vi.fn(),
    processInline: vi.fn(),
    getQueue: vi.fn(),
  },
  captureExceptionMock: vi.fn(),
  logInfoMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (...args: unknown[]) => mocks.createManagedQueueMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
    logInfo: (...args: unknown[]) => mocks.logInfoMock(...args),
  },
}));

describe('traderaListingQueue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.queueMock.enqueue.mockResolvedValue('queued-job-id');
    mocks.createManagedQueueMock.mockReturnValue(mocks.queueMock);
  });

  it('builds deterministic listing queue job ids', async () => {
    const { buildTraderaListingQueueJobId } = await import('./traderaListingQueue');

    expect(
      buildTraderaListingQueueJobId(
        {
          listingId: 'listing-1',
          action: 'list',
        },
        90_000
      )
    ).toBe('list__listing-1__connection_default__default__3');
    expect(
      buildTraderaListingQueueJobId(
        {
          listingId: 'listing-1',
          action: 'relist',
          browserMode: 'headed',
          selectorProfile: ' custom-profile ',
        },
        29_999
      )
    ).toBe('relist__listing-1__headed__custom-profile__0');
  });

  it('uses supplied job ids for enqueue payload and BullMQ dedupe options', async () => {
    const { enqueueTraderaListingJob } = await import('./traderaListingQueue');

    await expect(
      enqueueTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'api',
        jobId: 'job-known',
      })
    ).resolves.toBe('queued-job-id');

    expect(mocks.queueMock.enqueue).toHaveBeenCalledWith(
      {
        listingId: 'listing-1',
        action: 'list',
        source: 'api',
        jobId: 'job-known',
      },
      { jobId: 'job-known' }
    );
  });

  it('sanitizes custom job ids before enqueueing to BullMQ', async () => {
    const { enqueueTraderaListingJob } = await import('./traderaListingQueue');

    await expect(
      enqueueTraderaListingJob({
        listingId: 'listing-1',
        action: 'list',
        source: 'api',
        jobId: 'job:known headed',
      })
    ).resolves.toBe('queued-job-id');

    expect(mocks.queueMock.enqueue).toHaveBeenCalledWith(
      {
        listingId: 'listing-1',
        action: 'list',
        source: 'api',
        jobId: 'job_known_headed',
      },
      { jobId: 'job_known_headed' }
    );
  });
});
