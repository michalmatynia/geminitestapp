import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  runPlaywrightConnectionEngineTaskMock,
  startPlaywrightConnectionEngineTaskMock,
  readPlaywrightEngineRunMock,
} = vi.hoisted(() => ({
  runPlaywrightConnectionEngineTaskMock: vi.fn(),
  startPlaywrightConnectionEngineTaskMock: vi.fn(),
  readPlaywrightEngineRunMock: vi.fn(),
}));

vi.mock('./connection-runtime', async () => {
  const actual =
    await vi.importActual<typeof import('./connection-runtime')>('./connection-runtime');
  return {
    ...actual,
    runPlaywrightConnectionEngineTask: (...args: unknown[]) =>
      runPlaywrightConnectionEngineTaskMock(...args),
    startPlaywrightConnectionEngineTask: (...args: unknown[]) =>
      startPlaywrightConnectionEngineTaskMock(...args),
  };
});

vi.mock('./runtime', async () => {
  const actual = await vi.importActual<typeof import('./runtime')>('./runtime');
  return {
    ...actual,
    readPlaywrightEngineRun: (...args: unknown[]) => readPlaywrightEngineRunMock(...args),
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
      runtimeActionKey: 'tradera_check_status',
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
      runtimeActionKey: 'tradera_check_status',
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

  it('forwards the managed runtime action key through the queued start path', async () => {
    const onRunStarted = vi.fn();
    startPlaywrightConnectionEngineTaskMock.mockResolvedValue({
      runtime: {
        personaId: 'persona-queued',
      },
      settings: {
        headless: true,
        slowMo: 0,
        timeout: 20_000,
        navigationTimeout: 20_000,
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
        runId: 'run-queued',
        status: 'completed',
        logs: [],
        result: {
          outputs: {
            result: {
              status: 'ended',
            },
          },
          finalUrl: 'https://example.com/status',
        },
      },
    });
    readPlaywrightEngineRunMock.mockResolvedValue({
      runId: 'run-queued',
      status: 'completed',
      logs: [],
      result: {
        outputs: {
          result: {
            status: 'ended',
          },
        },
        finalUrl: 'https://example.com/status',
      },
    });

    const result = await runPlaywrightScrapeScript({
      connection: {
        id: 'connection-queued',
      } as never,
      script: 'export default async function run() {}',
      input: {
        listingUrl: 'https://example.com/status',
      },
      runtimeActionKey: 'tradera_check_status',
      onRunStarted,
    });

    expect(startPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith({
      connection: {
        id: 'connection-queued',
      },
      request: {
        script: 'export default async function run() {}',
        input: {
          listingUrl: 'https://example.com/status',
        },
        timeoutMs: 120_000,
        preventNewPages: true,
        browserEngine: 'chromium',
      },
      instance: undefined,
      runtimeActionKey: 'tradera_check_status',
      resolveEngineRequestConfig: expect.any(Function),
    });
    expect(readPlaywrightEngineRunMock).toHaveBeenCalledWith('run-queued');
    expect(onRunStarted).toHaveBeenCalledWith('run-queued');
    expect(result).toMatchObject({
      runId: 'run-queued',
      finalUrl: 'https://example.com/status',
      effectiveBrowserMode: 'headless',
      personaId: 'persona-queued',
      rawResult: {
        status: 'ended',
      },
    });
  });
});
