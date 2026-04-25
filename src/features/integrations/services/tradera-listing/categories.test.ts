import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';

const {
  MockTraderaCategorySequencer,
  MockTraderaListingFormCategorySequencer,
  buildResolvedActionStepsMock,
  createTraderaCategoryScrapePlaywrightInstanceMock,
  createTraderaStandardListingPlaywrightInstanceMock,
  contextStorageStateMock,
  ensureLoggedInMock,
  persistPlaywrightConnectionStorageStateMock,
  runPlaywrightConnectionNativeTaskMock,
  sequencerConstructorMock,
  listingFormSequencerConstructorMock,
  setMockSequencerError,
  setMockSequencerResult,
  setMockListingFormSequencerResult,
  updateConnectionMock,
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
    listingFormResult: typeof defaultResult;
    error: Error | null;
  } = {
    result: defaultResult,
    listingFormResult: {
      ...defaultResult,
      categorySource: 'listing-form-picker',
      scrapedFrom: 'https://www.tradera.com/en/selling/new',
    },
    error: null,
  };

  const buildResolvedActionStepsMock = vi.fn(async () => []);
  const contextStorageStateMock = vi.fn(async () => ({ cookies: [], origins: [] }));
  const ensureLoggedInMock = vi.fn(async () => undefined);
  const persistPlaywrightConnectionStorageStateMock = vi.fn(async () => undefined);
  const updateConnectionMock = vi.fn(async () => undefined);
  const createTraderaCategoryScrapePlaywrightInstanceMock = vi.fn(
    (input: Record<string, unknown> = {}) => ({
      kind: 'tradera_category_scrape',
      label: 'Tradera public category scrape',
      tags: ['integration', 'tradera', 'taxonomy'],
      ...input,
    })
  );
  const createTraderaStandardListingPlaywrightInstanceMock = vi.fn(
    (input: Record<string, unknown> = {}) => ({
      kind: 'tradera_standard_listing',
      label: 'Tradera standard listing',
      tags: ['integration', 'tradera', 'listing'],
      ...input,
    })
  );
  const runPlaywrightConnectionNativeTaskMock = vi.fn(
    async (input: Record<string, unknown>) => {
      const execute = input['execute'] as (session: Record<string, unknown>) => Promise<unknown>;
      return execute({
        page: {},
        context: {
          storageState: contextStorageStateMock,
        },
        runtime: {
          settings: {
            humanizeMouse: true,
            mouseJitter: 5,
            clickDelayMin: 50,
            clickDelayMax: 150,
            inputDelayMin: 20,
            inputDelayMax: 80,
            actionDelayMin: 500,
            actionDelayMax: 1500,
          },
        },
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
  const listingFormSequencerConstructorMock = vi.fn();

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

  class MockTraderaListingFormCategorySequencer {
    public result = null;

    constructor(context: Record<string, unknown>, input: Record<string, unknown>) {
      listingFormSequencerConstructorMock({ context, input });
    }

    async run(): Promise<void> {
      if (state.error) {
        throw state.error;
      }
      this.result = state.listingFormResult;
    }
  }

  return {
    buildResolvedActionStepsMock,
    createTraderaCategoryScrapePlaywrightInstanceMock,
    createTraderaStandardListingPlaywrightInstanceMock,
    contextStorageStateMock,
    ensureLoggedInMock,
    persistPlaywrightConnectionStorageStateMock,
    runPlaywrightConnectionNativeTaskMock,
    sequencerConstructorMock,
    listingFormSequencerConstructorMock,
    setMockSequencerError: (error: Error | null) => {
      state.error = error;
    },
    setMockSequencerResult: (result: typeof defaultResult) => {
      state.result = result;
    },
    setMockListingFormSequencerResult: (result: typeof defaultResult) => {
      state.listingFormResult = result;
    },
    updateConnectionMock,
    MockTraderaCategorySequencer,
    MockTraderaListingFormCategorySequencer,
  };
});

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  buildResolvedActionSteps: (...args: unknown[]) => buildResolvedActionStepsMock(...args),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/TraderaCategorySequencer', () => ({
  TraderaCategorySequencer: MockTraderaCategorySequencer,
}));

vi.mock('@/shared/lib/browser-execution/sequencers/TraderaListingFormCategorySequencer', () => ({
  TraderaListingFormCategorySequencer: MockTraderaListingFormCategorySequencer,
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    updateConnection: updateConnectionMock,
  }),
}));

vi.mock('./tradera-browser-auth', () => ({
  ensureLoggedIn: (...args: unknown[]) => ensureLoggedInMock(...args),
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
    createTraderaStandardListingPlaywrightInstance: (input: Record<string, unknown> = {}) =>
      createTraderaStandardListingPlaywrightInstanceMock(input),
    persistPlaywrightConnectionStorageState: (...args: unknown[]) =>
      persistPlaywrightConnectionStorageStateMock(...args),
    runPlaywrightConnectionNativeTask: (input: Record<string, unknown>) =>
      runPlaywrightConnectionNativeTaskMock(input),
  };
});

import {
  fetchTraderaCategoriesForConnection,
  fetchTraderaCategoriesFromListingFormForConnection,
} from './categories';

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
    contextStorageStateMock.mockResolvedValue({ cookies: [], origins: [] });
    ensureLoggedInMock.mockResolvedValue(undefined);
    persistPlaywrightConnectionStorageStateMock.mockResolvedValue(undefined);
    setMockSequencerError(null);
    setMockSequencerResult(makeSequencerResult());
    setMockListingFormSequencerResult(
      makeSequencerResult({
        categorySource: 'listing-form-picker',
        scrapedFrom: 'https://www.tradera.com/en/selling/new',
      })
    );
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
        'Tradera categories could not be scraped from the public categories pages — the taxonomy page structure may have changed. Retry category fetch using Listing form picker if it is available for this connection.',
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

describe('fetchTraderaCategoriesFromListingFormForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildResolvedActionStepsMock.mockResolvedValue([]);
    contextStorageStateMock.mockResolvedValue({ cookies: [], origins: [] });
    ensureLoggedInMock.mockResolvedValue(undefined);
    persistPlaywrightConnectionStorageStateMock.mockResolvedValue(undefined);
    setMockSequencerError(null);
    setMockSequencerResult(makeSequencerResult());
    setMockListingFormSequencerResult(
      makeSequencerResult({
        categories: [
          { id: '100', name: 'Accessories', parentId: null },
          { id: '101', name: 'Patches & pins', parentId: '100' },
        ],
        categorySource: 'listing-form-picker',
        scrapedFrom: 'https://www.tradera.com/en/selling/new',
      })
    );
  });

  it('authenticates the listing form session before scraping the category picker', async () => {
    const result = await fetchTraderaCategoriesFromListingFormForConnection(
      {
        id: 'connection-1',
        integrationId: 'integration-1',
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: 'expired-storage-state',
      } as never,
      {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      }
    );

    expect(result).toEqual([
      { id: '100', name: 'Accessories', parentId: '0' },
      { id: '101', name: 'Patches & pins', parentId: '100' },
    ]);
    expect(createTraderaStandardListingPlaywrightInstanceMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      integrationId: 'integration-1',
    });
    expect(ensureLoggedInMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'connection-1' }),
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        inputBehavior: expect.objectContaining({
          humanizeMouse: true,
          inputDelayMin: 20,
          inputDelayMax: 80,
        }),
      })
    );
    expect(contextStorageStateMock).toHaveBeenCalledTimes(1);
    expect(persistPlaywrightConnectionStorageStateMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      storageState: { cookies: [], origins: [] },
      updatedAt: expect.any(String),
      repo: expect.objectContaining({
        updateConnection: updateConnectionMock,
      }),
    });
    expect(listingFormSequencerConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          actionKey: 'tradera_fetch_categories',
          page: {},
        }),
        input: expect.objectContaining({
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
          reauthenticate: expect.any(Function),
        }),
      })
    );
  });

  it('surfaces auth recovery failures before running the category picker sequencer', async () => {
    ensureLoggedInMock.mockRejectedValueOnce(
      new Error('AUTH_REQUIRED: Tradera login failed or requires manual verification.')
    );

    await expect(
      fetchTraderaCategoriesFromListingFormForConnection(
        {
          id: 'connection-1',
          integrationId: 'integration-1',
          playwrightStorageState: 'expired-storage-state',
        } as never,
        {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        }
      )
    ).rejects.toThrow('AUTH_REQUIRED: Tradera login failed or requires manual verification.');

    expect(listingFormSequencerConstructorMock).not.toHaveBeenCalled();
    expect(contextStorageStateMock).not.toHaveBeenCalled();
    expect(persistPlaywrightConnectionStorageStateMock).not.toHaveBeenCalled();
  });

  it('passes a reauthenticate callback that re-runs the Tradera auth flow', async () => {
    await fetchTraderaCategoriesFromListingFormForConnection(
      {
        id: 'connection-1',
        integrationId: 'integration-1',
        username: 'user@example.com',
        password: 'encrypted-password',
        playwrightStorageState: 'storage-state',
      } as never,
      { listingFormUrl: 'https://www.tradera.com/en/selling/new' }
    );

    expect(ensureLoggedInMock).toHaveBeenCalledTimes(1);

    const constructorCall = listingFormSequencerConstructorMock.mock.calls[0]?.[0] as {
      input: { reauthenticate: () => Promise<boolean> };
    };
    const reauthenticate = constructorCall.input.reauthenticate;

    const result = await reauthenticate();

    expect(result).toBe(true);
    expect(ensureLoggedInMock).toHaveBeenCalledTimes(2);
    expect(persistPlaywrightConnectionStorageStateMock).toHaveBeenCalledTimes(2);
  });

  it('reports reauthenticate failure when ensureLoggedIn throws during reauth', async () => {
    await fetchTraderaCategoriesFromListingFormForConnection(
      {
        id: 'connection-1',
        integrationId: 'integration-1',
        playwrightStorageState: 'storage-state',
      } as never,
      { listingFormUrl: 'https://www.tradera.com/en/selling/new' }
    );

    const constructorCall = listingFormSequencerConstructorMock.mock.calls[0]?.[0] as {
      input: { reauthenticate: () => Promise<boolean> };
    };
    const reauthenticate = constructorCall.input.reauthenticate;
    ensureLoggedInMock.mockRejectedValueOnce(new Error('auth blew up'));

    const result = await reauthenticate();
    expect(result).toBe(false);
  });

  it('rejects listing form fetches whose crawl reported drill failures', async () => {
    setMockListingFormSequencerResult(
      makeSequencerResult({
        categories: [
          { id: '100', name: 'Accessories', parentId: null },
          { id: '101', name: 'Patches & pins', parentId: '100' },
        ],
        categorySource: 'listing-form-picker',
        scrapedFrom: 'https://www.tradera.com/en/selling/new',
        crawlStats: {
          pagesVisited: 5,
          rootCount: 2,
          drillFailureCount: 2,
          drillSessionAborted: true,
          lastFailedPath: ['Collectibles', 'Pins & Needles'],
        },
      })
    );

    await expect(
      fetchTraderaCategoriesFromListingFormForConnection(
        {
          id: 'connection-1',
          integrationId: 'integration-1',
          playwrightStorageState: 'expired-storage-state',
        } as never,
        {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        }
      )
    ).rejects.toThrow(/stopped responding mid-crawl/i);
  });
});
