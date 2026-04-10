import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_PUBLIC_CATEGORIES_URL } from '@/features/integrations/constants/tradera';

const { runPlaywrightConnectionEngineTaskMock } = vi.hoisted(() => ({
  runPlaywrightConnectionEngineTaskMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  runPlaywrightConnectionEngineTask: (input: Record<string, unknown>) =>
    runPlaywrightConnectionEngineTaskMock(input) as Promise<unknown>,
  createTraderaCategoryScrapePlaywrightInstance: (input: Record<string, unknown> = {}) => ({
    kind: 'tradera_category_scrape',
    label: 'Tradera public category scrape',
    tags: ['integration', 'tradera', 'taxonomy'],
    ...input,
  }),
  resolvePlaywrightEngineRunOutputs: (resultPayload: unknown) => {
    const payloadRecord =
      resultPayload && typeof resultPayload === 'object' && !Array.isArray(resultPayload)
        ? (resultPayload as Record<string, unknown>)
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

    return {
      outputs,
      resultValue,
      finalUrl:
        typeof payloadRecord['finalUrl'] === 'string' ? payloadRecord['finalUrl'].trim() : null,
    };
  },
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
        ? run['error'].replace(/^\[runtime\]\[error\]\s*/i, '').replace(/^Error:\s*/i, '').trim()
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
      messages.add(logLine.replace(/^\[runtime\]\[error\]\s*/i, '').replace(/^Error:\s*/i, '').trim());
    }

    return Array.from(messages);
  },
}));

import { fetchTraderaCategoriesForConnection } from './categories';

const makeConnectionTaskResult = (runOverrides?: Record<string, unknown>) => ({
  runtime: {
    browserPreference: 'auto',
    deviceContextOptions: {},
    deviceProfileName: null,
    personaId: undefined,
    storageState: {
      cookies: [],
      origins: [],
    },
    settings: {
      browser: 'auto',
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
    },
  },
  settings: {
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
  },
  browserPreference: 'auto',
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
    ...(runOverrides ?? {}),
  },
});

describe('fetchTraderaCategoriesForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(makeConnectionTaskResult());
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
    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({
        id: 'connection-1',
        playwrightStorageState: 'encrypted-storage-state',
      }),
      request: expect.objectContaining({
        browserEngine: 'chromium',
        preventNewPages: true,
        startUrl: TRADERA_PUBLIC_CATEGORIES_URL,
        timeoutMs: 300_000,
        input: {
          connectionId: 'connection-1',
          traderaConfig: {
            categoriesUrl: TRADERA_PUBLIC_CATEGORIES_URL,
          },
        },
      }),
      instance: expect.objectContaining({
        kind: 'tradera_category_scrape',
      }),
    });
  });

  it('does not require a stored browser session for the public crawl', async () => {
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
        result: {
          outputs: {
            result: {
              categories: [{ id: '100', name: 'Accessories', parentId: '0' }],
              categorySource: 'public-categories',
            },
          },
          finalUrl: TRADERA_PUBLIC_CATEGORIES_URL,
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
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
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
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
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
