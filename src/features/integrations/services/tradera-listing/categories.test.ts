import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';

const { runPlaywrightScrapeScriptMock } = vi.hoisted(() => ({
  runPlaywrightScrapeScriptMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    runPlaywrightScrapeScript: (input: Record<string, unknown>) =>
      runPlaywrightScrapeScriptMock(input) as Promise<unknown>,
    createTraderaCategoryScrapePlaywrightInstance: (input: Record<string, unknown> = {}) => ({
      kind: 'tradera_category_scrape',
      label: 'Tradera public category scrape',
      tags: ['integration', 'tradera', 'taxonomy'],
      ...input,
    }),
    buildPlaywrightEngineRunFailureMeta: (run: Record<string, unknown>) => {
      const payloadRecord =
        run['result'] && typeof run['result'] === 'object' && !Array.isArray(run['result'])
          ? (run['result'] as Record<string, unknown>)
          : {};
      const outputs =
        payloadRecord['outputs'] &&
        typeof payloadRecord['outputs'] === 'object' &&
        !Array.isArray(payloadRecord['outputs'])
          ? (payloadRecord['outputs'] as Record<string, unknown>)
          : payloadRecord;
      const resultValue =
        outputs['result'] && typeof outputs['result'] === 'object' && !Array.isArray(outputs['result'])
          ? (outputs['result'] as Record<string, unknown>)
          : outputs;
      const finalUrl =
        typeof payloadRecord['finalUrl'] === 'string' ? payloadRecord['finalUrl'].trim() : null;

      return {
        runId: run['runId'],
        runStatus: run['status'],
        finalUrl,
        latestStage:
          typeof resultValue['stage'] === 'string' ? resultValue['stage'].trim() : null,
        latestStageUrl:
          typeof resultValue['currentUrl'] === 'string'
            ? resultValue['currentUrl'].trim()
            : finalUrl,
        failureArtifacts: Array.isArray(run['artifacts']) ? run['artifacts'] : [],
        logTail: Array.isArray(run['logs']) ? (run['logs'] as unknown[]).slice(-12) : [],
      };
    },
    collectPlaywrightEngineRunFailureMessages: (run: Record<string, unknown>) => {
      const messages = new Set<string>();
      const directMessage =
        typeof run['error'] === 'string'
          ? run['error']
              .replace(/^\[runtime\]\[error\]\s*/i, '')
              .replace(/^Error:\s*/i, '')
              .trim()
          : null;
      if (directMessage) {
        messages.add(directMessage);
      }

      const payloadRecord =
        run['result'] && typeof run['result'] === 'object' && !Array.isArray(run['result'])
          ? (run['result'] as Record<string, unknown>)
          : {};
      const outputs =
        payloadRecord['outputs'] &&
        typeof payloadRecord['outputs'] === 'object' &&
        !Array.isArray(payloadRecord['outputs'])
          ? (payloadRecord['outputs'] as Record<string, unknown>)
          : payloadRecord;
      const resultValue =
        outputs['result'] && typeof outputs['result'] === 'object' && !Array.isArray(outputs['result'])
          ? (outputs['result'] as Record<string, unknown>)
          : outputs;
      const resultMessage =
        typeof resultValue['message'] === 'string'
          ? resultValue['message'].replace(/^Error:\s*/i, '').trim()
          : null;
      if (resultMessage) {
        messages.add(resultMessage);
      }

      for (const logLine of Array.isArray(run['logs']) ? run['logs'] : []) {
        if (typeof logLine !== 'string' || !logLine.toLowerCase().includes('[runtime][error]')) {
          continue;
        }
        messages.add(
          logLine.replace(/^\[runtime\]\[error\]\s*/i, '').replace(/^Error:\s*/i, '').trim()
        );
      }

      return Array.from(messages);
    },
  };
});

import { fetchTraderaCategoriesForConnection } from './categories';

const makeScrapeResult = (
  overrides?: Partial<{
    run: Record<string, unknown>;
    rawResult: Record<string, unknown>;
    finalUrl: string | null;
  }>
) => ({
  run: {
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
    ...(overrides?.run ?? {}),
  },
  rawResult: overrides?.rawResult ?? {
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
  finalUrl: overrides?.finalUrl ?? TRADERA_PUBLIC_CATEGORIES_URL,
});

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightScrapeScriptMock.mockResolvedValue(makeScrapeResult());
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
    expect(runPlaywrightScrapeScriptMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      }),
      script: expect.any(String),
      input: {
        connectionId: 'connection-1',
        traderaConfig: {
          categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        },
      },
      timeoutMs: 300_000,
      startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
      capture: {
        screenshot: true,
        html: true,
      },
      instance: expect.objectContaining({
        kind: 'tradera_category_scrape',
      }),
    });
  });

  it('does not require a stored browser session for the public crawl', async () => {
    runPlaywrightScrapeScriptMock.mockResolvedValue(
      makeScrapeResult({
        rawResult: {
          categories: [{ id: '100', name: 'Accessories', parentId: '0' }],
          categorySource: 'public-categories',
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

  it('surfaces failed public crawl runs as operation errors', async () => {
    runPlaywrightScrapeScriptMock.mockResolvedValue(
      makeScrapeResult({
        run: {
          runId: 'run-failed',
          status: 'failed',
          error: null,
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
        },
      })
    );

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
    runPlaywrightScrapeScriptMock.mockResolvedValue(
      makeScrapeResult({
        run: {
          runId: 'run-empty',
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
        },
        rawResult: {
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
