import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';

const {
  enqueuePlaywrightNodeRunMock,
  parsePersistedStorageStateMock,
  resolveConnectionPlaywrightSettingsMock,
} = vi.hoisted(() => ({
  enqueuePlaywrightNodeRunMock: vi.fn(),
  parsePersistedStorageStateMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
}));

vi.mock('@/features/ai/server', () => ({
  enqueuePlaywrightNodeRun: (...args: unknown[]) => enqueuePlaywrightNodeRunMock(...args),
}));

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  parsePersistedStorageState: (...args: unknown[]) => parsePersistedStorageStateMock(...args),
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args),
}));

import { fetchTraderaCategoriesForConnection } from './categories';

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parsePersistedStorageStateMock.mockReturnValue({
      cookies: [],
      origins: [],
    });
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 0,
      timeout: 30_000,
      navigationTimeout: 30_000,
      humanizeMouse: false,
      mouseJitter: 6,
      clickDelayMin: 30,
      clickDelayMax: 120,
      inputDelayMin: 20,
      inputDelayMax: 120,
      actionDelayMin: 200,
      actionDelayMax: 900,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
  });

  it('runs the public Tradera categories crawl and returns normalized categories', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-123',
      status: 'completed',
      error: null,
      artifacts: [],
      logs: [],
      result: {
        outputs: {
          result: {
            categories: [
              { id: '100', name: 'Accessories', parentId: null },
              { id: '101', name: 'Patches & pins', parentId: '100' },
              { id: '102', name: 'Pins', parentId: '101' },
              { id: '200', name: 'Antiques & Design', parentId: '0' },
              { id: '102', name: 'Pins duplicate', parentId: '101' },
            ],
            categorySource: 'public-categories',
            crawlStats: {
              pagesVisited: 4,
              rootCount: 2,
            },
          },
        },
        finalUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      },
    });

    const result = await fetchTraderaCategoriesForConnection({
      id: 'connection-1',
      playwrightStorageState: 'encrypted-storage-state',
      playwrightPersonaId: 'persona-1',
    } as never);

    expect(result).toEqual([
      { id: '100', name: 'Accessories', parentId: '0' },
      { id: '101', name: 'Patches & pins', parentId: '100' },
      { id: '102', name: 'Pins', parentId: '101' },
      { id: '200', name: 'Antiques & Design', parentId: '0' },
    ]);

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledWith({
      request: expect.objectContaining({
        browserEngine: 'chromium',
        preventNewPages: true,
        startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        timeoutMs: 300_000,
        personaId: 'persona-1',
        contextOptions: {
          storageState: {
            cookies: [],
            origins: [],
          },
        },
        input: {
          connectionId: 'connection-1',
          traderaConfig: {
            categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
          },
        },
      }),
      waitForResult: true,
    });
  });

  it('does not require a stored browser session for the public crawl', async () => {
    parsePersistedStorageStateMock.mockReturnValue(null);
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-public',
      status: 'completed',
      error: null,
      artifacts: [],
      logs: [],
      result: {
        outputs: {
          result: {
            categories: [{ id: '100', name: 'Accessories', parentId: '0' }],
            categorySource: 'public-categories',
          },
        },
        finalUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: null,
      } as never)
    ).resolves.toEqual([{ id: '100', name: 'Accessories', parentId: '0' }]);

    expect(enqueuePlaywrightNodeRunMock).toHaveBeenCalledTimes(1);
    expect(enqueuePlaywrightNodeRunMock.mock.calls[0]?.[0]).toMatchObject({
      request: expect.objectContaining({
        startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      }),
    });
    expect(enqueuePlaywrightNodeRunMock.mock.calls[0]?.[0]?.request).not.toHaveProperty(
      'contextOptions'
    );
  });

  it('surfaces failed public crawl runs as operation errors', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-failed',
      status: 'failed',
      error: null,
      artifacts: [],
      logs: [
        '[runtime] Launching chromium browser.',
        '[runtime][error] Error: Failed to crawl Tradera category pages.',
      ],
      result: {
        outputs: {
          result: {},
        },
        finalUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      },
    });

    await expect(
      fetchTraderaCategoriesForConnection({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      } as never)
    ).rejects.toMatchObject({
      message: 'Failed to crawl Tradera category pages.',
      httpStatus: 422,
      meta: expect.objectContaining({
        connectionId: 'connection-1',
      }),
    });
  });

  it('fails when the public crawl completes without categories', async () => {
    enqueuePlaywrightNodeRunMock.mockResolvedValue({
      runId: 'run-empty',
      status: 'completed',
      error: null,
      artifacts: [{ name: 'tradera-category-empty', path: 'run-empty/tradera-category-empty.png' }],
      logs: ['[user] tradera.category.scrape.empty {}'],
      result: {
        outputs: {
          result: {
            categories: [],
            categorySource: 'public-categories',
            scrapedFrom: TRADERA_PUBLIC_CATEGORIES_URL,
            diagnostics: {
              seedStatus: 200,
            },
            crawlStats: {
              pagesVisited: 1,
              rootCount: 0,
            },
          },
        },
        finalUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      },
    });

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
