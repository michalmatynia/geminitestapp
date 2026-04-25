import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  MockTraderaListingFormCategorySequencer,
  buildResolvedActionStepsMock,
  createTraderaStandardListingPlaywrightInstanceMock,
  contextStorageStateMock,
  ensureLoggedInMock,
  persistPlaywrightConnectionStorageStateMock,
  runPlaywrightConnectionNativeTaskMock,
  listingFormSequencerConstructorMock,
  setMockSequencerError,
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
    categorySource: 'listing-form-picker',
    scrapedFrom: 'https://www.tradera.com/en/selling/new',
    diagnostics: null,
    crawlStats: {
      pagesVisited: 4,
      rootCount: 2,
    },
  };

  const state: {
    listingFormResult: typeof defaultResult;
    error: Error | null;
  } = {
    listingFormResult: defaultResult,
    error: null,
  };

  const buildResolvedActionStepsMock = vi.fn(async () => []);
  const contextStorageStateMock = vi.fn(async () => ({ cookies: [], origins: [] }));
  const ensureLoggedInMock = vi.fn(async () => undefined);
  const persistPlaywrightConnectionStorageStateMock = vi.fn(async () => undefined);
  const updateConnectionMock = vi.fn(async () => undefined);
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
  const listingFormSequencerConstructorMock = vi.fn();

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
    createTraderaStandardListingPlaywrightInstanceMock,
    contextStorageStateMock,
    ensureLoggedInMock,
    persistPlaywrightConnectionStorageStateMock,
    runPlaywrightConnectionNativeTaskMock,
    listingFormSequencerConstructorMock,
    setMockSequencerError: (error: Error | null) => {
      state.error = error;
    },
    setMockListingFormSequencerResult: (result: typeof defaultResult) => {
      state.listingFormResult = result;
    },
    updateConnectionMock,
    MockTraderaListingFormCategorySequencer,
  };
});

vi.mock('@/shared/lib/browser-execution/runtime-action-resolver.server', () => ({
  buildResolvedActionSteps: (...args: unknown[]) => buildResolvedActionStepsMock(...args),
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
    createTraderaStandardListingPlaywrightInstance: (input: Record<string, unknown> = {}) =>
      createTraderaStandardListingPlaywrightInstanceMock(input),
    persistPlaywrightConnectionStorageState: (...args: unknown[]) =>
      persistPlaywrightConnectionStorageStateMock(...args),
    runPlaywrightConnectionNativeTask: (input: Record<string, unknown>) =>
      runPlaywrightConnectionNativeTaskMock(input),
  };
});

import { fetchTraderaCategoriesFromListingFormForConnection } from './categories';

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
  categorySource: overrides?.categorySource ?? 'listing-form-picker',
  scrapedFrom: overrides?.scrapedFrom ?? 'https://www.tradera.com/en/selling/new',
  diagnostics: overrides?.diagnostics ?? null,
  crawlStats: overrides?.crawlStats ?? {
    pagesVisited: 4,
    rootCount: 2,
  },
});

describe('fetchTraderaCategoriesFromListingFormForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildResolvedActionStepsMock.mockResolvedValue([]);
    contextStorageStateMock.mockResolvedValue({ cookies: [], origins: [] });
    ensureLoggedInMock.mockResolvedValue(undefined);
    persistPlaywrightConnectionStorageStateMock.mockResolvedValue(undefined);
    setMockSequencerError(null);
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
