import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';

const {
  MockTraderaCategorySequencer,
  buildResolvedActionStepsMock,
  createTraderaCategoryScrapePlaywrightInstanceMock,
  runPlaywrightConnectionNativeTaskMock,
  sequencerConstructorMock,
  setMockSequencerError,
  setMockSequencerResult,
} = vi.hoisted(() => {
  const defaultResult = {
    categories: [
      { id: '100', name: 'Accessories', parentId: null },
      { id: '101', name: 'Patches & pins', parentId: '100' },
      { id: '102', name: 'Pins', parentId: '101' },
      { id: '200', name: 'Antiques & Design', parentId: '0' },
      { id: '102', name: 'Pins duplicate', parentId: '101' },
    ],
    categorySource: 'public-categories',
    scrapedFrom: 'https://www.tradera.com/category/all',
    diagnostics: null,
    crawlStats: {
      pagesVisited: 4,
      rootCount: 2,
    },
  };

  const state: {
    result: typeof defaultResult;
    error: Error | null;
  } = {
    result: defaultResult,
    error: null,
  };

  const buildResolvedActionStepsMock = vi.fn(async () => []);
  const createTraderaCategoryScrapePlaywrightInstanceMock = vi.fn(
    (input: Record<string, unknown> = {}) => ({
      kind: 'tradera_category_scrape',
      label: 'Tradera public category scrape',
      tags: ['integration', 'tradera', 'taxonomy'],
      ...input,
    })
  );
  const runPlaywrightConnectionNativeTaskMock = vi.fn(
    async (input: Record<string, unknown>) => {
      const execute = input['execute'] as (session: Record<string, unknown>) => Promise<unknown>;
      return execute({
        page: {},
        close: vi.fn(),
        sessionMetadata: {
          instance: input['instance'],
          browserLabel: 'Chrome',
          fallbackMessages: [],
          resolvedBrowserPreference: 'auto',
          personaId: 'persona-1',
          deviceProfileName: 'Desktop Chrome',
        },
        effectiveBrowserMode: 'headed',
        effectiveBrowserPreference: 'chrome',
        requestedBrowserMode: null,
        requestedBrowserPreference: null,
      });
    }
  );
  const sequencerConstructorMock = vi.fn();

  class MockTraderaCategorySequencer {
    public result = null;

    constructor(context: Record<string, unknown>, input: Record<string, unknown>) {
      sequencerConstructorMock({ context, input });
    }

    async run(): Promise<void> {
      if (state.error) {
        throw state.error;
      }
      this.result = state.result;
    }
  }

  return {
    buildResolvedActionStepsMock,
    createTraderaCategoryScrapePlaywrightInstanceMock,
    runPlaywrightConnectionNativeTaskMock,
    sequencerConstructorMock,
    setMockSequencerError: (error: Error | null) => {
      state.error = error;
    },
    setMockSequencerResult: (result: typeof defaultResult) => {
      state.result = result;
    },
    MockTraderaCategorySequencer,
  };
});

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  buildResolvedActionSteps: (...args: unknown[]) => buildResolvedActionStepsMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/TraderaCategorySequencer', () => ({
  TraderaCategorySequencer: MockTraderaCategorySequencer,
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    createTraderaCategoryScrapePlaywrightInstance: (input: Record<string, unknown> = {}) =>
      createTraderaCategoryScrapePlaywrightInstanceMock(input),
    runPlaywrightConnectionNativeTask: (input: Record<string, unknown>) =>
      runPlaywrightConnectionNativeTaskMock(input),
  };
});

import { fetchTraderaCategoriesForConnection } from './categories';

const makeSequencerResult = (
  overrides?: Partial<{
    categories: Array<{ id: string; name: string; parentId: string | null }>;
    categorySource: string;
    scrapedFrom: string;
    diagnostics: Record<string, unknown> | null;
    crawlStats: Record<string, unknown> | null;
  }>
) => ({
  categories: overrides?.categories ?? [
    { id: '100', name: 'Accessories', parentId: null },
    { id: '101', name: 'Patches & pins', parentId: '100' },
    { id: '102', name: 'Pins', parentId: '101' },
    { id: '200', name: 'Antiques & Design', parentId: '0' },
    { id: '102', name: 'Pins duplicate', parentId: '101' },
  ],
  categorySource: overrides?.categorySource ?? 'public-categories',
  scrapedFrom: overrides?.scrapedFrom ?? TRADERA_PUBLIC_CATEGORIES_URL,
  diagnostics: overrides?.diagnostics ?? null,
  crawlStats: overrides?.crawlStats ?? {
    pagesVisited: 4,
    rootCount: 2,
  },
});

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildResolvedActionStepsMock.mockResolvedValue([]);
    setMockSequencerError(null);
    setMockSequencerResult(makeSequencerResult());
  });

  it('runs the public Tradera categories crawl and returns normalized categories', async () => {
    const result = await fetchTraderaCategoriesForConnection({
      id: 'connection-1',
      integrationId: 'integration-1',
      playwrightStorageState: 'encrypted-storage-state',
      playwrightPersonaId: 'persona-1',
    } as never);

    expect(result).toEqual([
      { id: '100', name: 'Accessories', parentId: '0' },
      { id: '101', name: 'Patches & pins', parentId: '100' },
      { id: '102', name: 'Pins', parentId: '101' },
      { id: '200', name: 'Antiques & Design', parentId: '0' },
    ]);
    expect(buildResolvedActionStepsMock).toHaveBeenCalledWith('tradera_fetch_categories');
    expect(createTraderaCategoryScrapePlaywrightInstanceMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      integrationId: 'integration-1',
    });
    expect(runPlaywrightConnectionNativeTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          id: 'connection-1',
          playwrightStorageState: 'encrypted-storage-state',
        }),
        instance: expect.objectContaining({
          kind: 'tradera_category_scrape',
          connectionId: 'connection-1',
          integrationId: 'integration-1',
        }),
        runtimeActionKey: 'tradera_fetch_categories',
        execute: expect.any(Function),
        getErrorMessage: expect.any(Function),
      })
    );
    expect(sequencerConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          actionKey: 'tradera_fetch_categories',
          page: {},
        }),
        input: {
          categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        },
      })
    );
  });

  it('does not require a stored browser session for the public crawl', async () => {
    setMockSequencerResult(
      makeSequencerResult({
        categories: [{ id: '100', name: 'Accessories', parentId: '0' }],
        crawlStats: {
          pagesVisited: 1,
          rootCount: 1,
        },
      })
    );

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        integrationId: 'integration-1',
        playwrightStorageState: null,
      } as never)
    ).resolves.toEqual([{ id: '100', name: 'Accessories', parentId: '0' }]);
  });

  it('surfaces crawl failures from the public categories sequencer', async () => {
    setMockSequencerError(new Error('Failed to crawl Tradera category pages.'));

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message: 'Failed to crawl Tradera category pages.',
    });
  });

  it('fails when the public crawl completes without categories', async () => {
    setMockSequencerResult(
      makeSequencerResult({
        categories: [],
        diagnostics: {
          seedStatus: 200,
        },
        crawlStats: {
          pagesVisited: 1,
          rootCount: 0,
        },
      })
    );

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message:
        'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Configure Tradera API credentials (App ID and App Key) on the connection to fetch categories via the Tradera SOAP API instead.',
      httpStatus: 422,
      meta: expect.objectContaining({
        connectionId: 'connection-1',
        categorySource: 'public-categories',
        scrapedFrom: TRADERA_PUBLIC_CATEGORIES_URL,
        diagnostics: {
          seedStatus: 200,
        },
        crawlStats: {
          pagesVisited: 1,
          rootCount: 0,
        },
      }),
    });
  });
});
