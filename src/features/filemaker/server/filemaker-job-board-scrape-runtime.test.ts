import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runFilemakerJobBoardScrapeMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/redis', () => ({
  getRedisClient: () => null,
}));

vi.mock('@/shared/lib/redis-pubsub', () => ({
  publishRunEvent: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  createManagedQueue: (config: {
    processor: (data: unknown, jobId: string, signal?: AbortSignal) => Promise<unknown>;
  }) => ({
    enqueue: vi.fn(async () => 'queued'),
    getHealthStatus: vi.fn(),
    getQueue: () => null,
    processInline: (data: unknown) => config.processor(data, 'inline-test'),
    startWorker: vi.fn(),
    stopWorker: vi.fn(),
  }),
}));

vi.mock('./filemaker-job-board-scrape', () => ({
  runFilemakerJobBoardScrape: mocks.runFilemakerJobBoardScrapeMock,
}));

import {
  cancelFilemakerJobBoardScrapeRun,
  enqueueFilemakerJobBoardScrapeRun,
  readFilemakerJobBoardScrapeRun,
} from './filemaker-job-board-scrape-runtime';

const sourceUrl = 'https://www.pracuj.pl/praca/it;kw';

const successfulResponse = {
  browserMode: 'headless',
  mode: 'preview',
  offers: [],
  provider: 'pracuj_pl',
  runId: 'scraper-run-1',
  sourceSite: 'pracuj.pl',
  sourceUrl,
  summary: {
    addressUpdates: 0,
    createdLexiconTerms: 0,
    createdListings: 0,
    createdOrganizations: 0,
    linkedLexiconTerms: 0,
    matchedOffers: 0,
    profileUpdates: 0,
    scrapedOffers: 0,
    skippedOffers: 0,
    unmatchedOffers: 0,
    updatedListings: 0,
    updatedOrganizations: 0,
    verifiedListings: 0,
  },
  warnings: [],
};

const waitForDetachedRuntime = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });
};

const waitUntil = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await waitForDetachedRuntime();
  }
  throw new Error('Timed out waiting for runtime condition.');
};

describe('filemaker job-board scrape runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runFilemakerJobBoardScrapeMock.mockImplementation(
      async (
        _request: unknown,
        options: { onEvent?: (event: unknown) => Promise<void> | void }
      ) => {
        await options.onEvent?.({
          at: '2026-04-28T10:00:00.000Z',
          message: 'Collecting job-board offer links.',
          type: 'status',
        });
        return successfulResponse;
      }
    );
  });

  it('returns a queued run immediately and completes through the runtime store', async () => {
    const started = await enqueueFilemakerJobBoardScrapeRun({
      mode: 'preview',
      sourceUrl,
    });

    expect(started.run.status).toBe('queued');
    expect(mocks.runFilemakerJobBoardScrapeMock).not.toHaveBeenCalled();

    await waitForDetachedRuntime();

    const snapshot = await readFilemakerJobBoardScrapeRun(started.run.id);
    expect(snapshot.run).toMatchObject({
      id: started.run.id,
      result: successfulResponse,
      status: 'completed',
    });
    expect(snapshot.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'run' }),
        expect.objectContaining({
          message: 'Collecting job-board offer links.',
          type: 'status',
        }),
      ])
    );
    expect(mocks.runFilemakerJobBoardScrapeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'preview',
        sourceUrl,
      }),
      expect.objectContaining({
        onEvent: expect.any(Function),
        signal: expect.any(AbortSignal),
      })
    );
  });

  it('cancels an active runtime run and aborts the scraper signal', async () => {
    let scraperSignal: AbortSignal | null = null;
    mocks.runFilemakerJobBoardScrapeMock.mockImplementationOnce(
      async (_request: unknown, options: { signal: AbortSignal }) => {
        scraperSignal = options.signal;
        return new Promise((resolve) => {
          options.signal.addEventListener('abort', () => {
            resolve(successfulResponse);
          }, { once: true });
        });
      }
    );

    const started = await enqueueFilemakerJobBoardScrapeRun({
      mode: 'preview',
      sourceUrl,
    });
    await waitUntil(() => scraperSignal !== null);

    const canceled = await cancelFilemakerJobBoardScrapeRun(started.run.id);
    await waitForDetachedRuntime();
    const snapshot = await readFilemakerJobBoardScrapeRun(started.run.id);

    expect(scraperSignal?.aborted).toBe(true);
    expect(canceled.run?.status).toBe('canceled');
    expect(snapshot.run?.status).toBe('canceled');
  });

  it('reuses an active run for an identical scrape request', async () => {
    let scraperSignal: AbortSignal | null = null;
    mocks.runFilemakerJobBoardScrapeMock.mockImplementationOnce(
      async (_request: unknown, options: { signal: AbortSignal }) => {
        scraperSignal = options.signal;
        return new Promise((resolve) => {
          options.signal.addEventListener('abort', () => {
            resolve(successfulResponse);
          }, { once: true });
        });
      }
    );

    const first = await enqueueFilemakerJobBoardScrapeRun({
      mode: 'preview',
      selectedOrganizationIds: ['org-2', 'org-1'],
      sourceUrl,
    });
    const second = await enqueueFilemakerJobBoardScrapeRun({
      mode: 'preview',
      selectedOrganizationIds: ['org-1', 'org-2'],
      sourceUrl,
    });

    expect(second.run.id).toBe(first.run.id);
    await waitUntil(() => scraperSignal !== null);
    expect(mocks.runFilemakerJobBoardScrapeMock).toHaveBeenCalledTimes(1);

    await cancelFilemakerJobBoardScrapeRun(first.run.id);
  });
});
