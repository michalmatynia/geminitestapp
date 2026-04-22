import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runPlaywrightConnectionEngineTaskMock } = vi.hoisted(() => ({
  runPlaywrightConnectionEngineTaskMock: vi.fn(),
}));

vi.mock('./connection-runtime', async () => {
  const actual =
    await vi.importActual<typeof import('./connection-runtime')>('./connection-runtime');
  return {
    ...actual,
    runPlaywrightConnectionEngineTask: (...args: unknown[]) =>
      runPlaywrightConnectionEngineTaskMock(...args),
  };
});

import { runPlaywrightScrapeScript } from './scrape';

describe('playwright scrape helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue({
      runtime: {
        personaId: 'persona-1',
      },
      settings: {
        headless: false,
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
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      browserPreference: 'chrome',
      run: {
        runId: 'run-123',
        status: 'completed',
        logs: ['[runtime][info] ok'],
        result: {
          outputs: {
            result: {
              categories: [{ id: '1', name: 'Accessories' }],
            },
          },
          finalUrl: 'https://example.com/categories',
        },
      },
      outputs: {
        result: {
          categories: [{ id: '1', name: 'Accessories' }],
        },
      },
      resultValue: {
        categories: [{ id: '1', name: 'Accessories' }],
      },
      finalUrl: 'https://example.com/categories',
    });
  });

  it('builds a centralized scrape result with effective execution metadata', async () => {
    const result = await runPlaywrightScrapeScript({
      connection: {
        id: 'connection-1',
      } as never,
      script: 'export default async function run() {}',
      input: {
        startUrl: 'https://example.com/categories',
      },
      timeoutMs: 90_000,
      instance: {
        kind: 'tradera_category_scrape',
        family: 'scrape',
      },
    });

    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith({
      connection: {
        id: 'connection-1',
      },
      request: {
        script: 'export default async function run() {}',
        input: {
          startUrl: 'https://example.com/categories',
        },
        timeoutMs: 90_000,
        preventNewPages: true,
        browserEngine: 'chromium',
        startUrl: 'https://example.com/categories',
      },
      instance: {
        kind: 'tradera_category_scrape',
        family: 'scrape',
      },
      resolveEngineRequestConfig: expect.any(Function),
    });
    expect(result).toMatchObject({
      runId: 'run-123',
      finalUrl: 'https://example.com/categories',
      effectiveBrowserMode: 'headed',
      personaId: 'persona-1',
      rawResult: {
        categories: [{ id: '1', name: 'Accessories' }],
      },
      outputs: {
        result: {
          categories: [{ id: '1', name: 'Accessories' }],
        },
      },
      logs: ['[runtime][info] ok'],
      executionSettings: expect.objectContaining({
        headless: false,
        deviceName: 'Desktop Chrome',
      }),
    });
  });
});
