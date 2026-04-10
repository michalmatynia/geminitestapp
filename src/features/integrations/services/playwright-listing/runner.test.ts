import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedPlaywrightConnectionRuntime } from '@/features/playwright/server';

const { runPlaywrightConnectionEngineTaskMock } = vi.hoisted(() => ({
  runPlaywrightConnectionEngineTaskMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  runPlaywrightConnectionEngineTask: (input: Record<string, unknown>) =>
    runPlaywrightConnectionEngineTaskMock(input) as Promise<unknown>,
  createProgrammableListingPlaywrightInstance: (input: Record<string, unknown> = {}) => ({
    kind: 'programmable_listing',
    label: 'Programmable Playwright listing',
    tags: ['integration', 'listing'],
    ...input,
  }),
  createProgrammableImportPlaywrightInstance: (input: Record<string, unknown> = {}) => ({
    kind: 'programmable_import',
    label: 'Programmable Playwright import',
    tags: ['integration', 'import'],
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
  buildPlaywrightEngineRunFailureMeta: (
    run: Record<string, unknown>,
    options?: { includeRawResult?: boolean }
  ) => {
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
      ...(options?.includeRawResult
        ? {
            rawResult: Object.keys(resultValue).length > 0 ? resultValue : null,
          }
        : {}),
    };
  },
}));

import { runPlaywrightListingScript } from './runner';

const defaultRuntimeSettings = {
  browser: 'auto',
  headless: true,
  slowMo: 85,
  timeout: 30_000,
  navigationTimeout: 30_000,
  humanizeMouse: true,
  mouseJitter: 11,
  clickDelayMin: 45,
  clickDelayMax: 140,
  inputDelayMin: 35,
  inputDelayMax: 125,
  actionDelayMin: 250,
  actionDelayMax: 950,
  proxyEnabled: false,
  proxyServer: '',
  proxyUsername: '',
  proxyPassword: '',
  emulateDevice: false,
  deviceName: 'Desktop Chrome',
} as const;

const defaultStorageState = {
  cookies: [{ name: 'session', value: 'abc', domain: '.tradera.com', path: '/' }],
  origins: [],
} as const;

const makeRuntime = (
  overrides: Partial<ResolvedPlaywrightConnectionRuntime> = {}
): ResolvedPlaywrightConnectionRuntime => ({
  browserPreference: 'auto',
  deviceContextOptions: {},
  deviceProfileName: null,
  personaId: undefined,
  storageState: defaultStorageState,
  settings: {
    ...defaultRuntimeSettings,
    ...(overrides.settings ?? {}),
  },
  ...overrides,
});

const makeConnectionTaskResult = (overrides?: {
  runtime?: Partial<ResolvedPlaywrightConnectionRuntime>;
  settings?: Partial<(typeof defaultRuntimeSettings)>;
  run?: Record<string, unknown>;
}) => ({
  runtime: makeRuntime(overrides?.runtime),
  settings: {
    ...defaultRuntimeSettings,
    ...(overrides?.settings ?? {}),
  },
  browserPreference:
    overrides?.runtime?.browserPreference ??
    overrides?.runtime?.settings?.browser ??
    defaultRuntimeSettings.browser,
  run: {
    runId: 'run-123',
    status: 'completed',
    result: {
      outputs: {
        result: {
          externalListingId: 'listing-123',
          listingUrl: 'https://www.tradera.com/item/123',
          publishVerified: true,
        },
      },
    },
    ...(overrides?.run ?? {}),
  },
});

describe('runPlaywrightListingScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(makeConnectionTaskResult());
  });

  it('passes the connection browser preference through the engine config resolver', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {} as never,
    });

    const call = runPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
        browserPreference?: string | null;
      };
    };
    const resolved = call.resolveEngineRequestConfig(
      makeRuntime({
        browserPreference: 'chrome',
        settings: {
          ...defaultRuntimeSettings,
          browser: 'chrome',
        },
      })
    );

    expect(resolved.browserPreference).toBe('chrome');
  });

  it('keeps Brave browser preference available to the centralized engine config', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {} as never,
    });

    const call = runPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
        browserPreference?: string | null;
      };
    };
    const resolved = call.resolveEngineRequestConfig(
      makeRuntime({
        browserPreference: 'brave',
        settings: {
          ...defaultRuntimeSettings,
          browser: 'brave',
        },
      })
    );

    expect(resolved.browserPreference).toBe('brave');
  });

  it('returns mapped listing details and runtime-derived execution summary', async () => {
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
        runtime: {
          personaId: 'persona-1',
        },
        settings: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );

    const result = await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {
        playwrightPersonaId: 'persona-1',
        playwrightStorageState: 'encrypted-state',
      } as never,
    });

    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: expect.objectContaining({
          playwrightStorageState: 'encrypted-state',
        }),
        request: expect.objectContaining({
          script: 'export default async function run() {}',
          input: { title: 'Example' },
          browserEngine: 'chromium',
          preventNewPages: true,
        }),
        instance: expect.objectContaining({
          kind: 'programmable_listing',
        }),
      })
    );
    expect(result).toMatchObject({
      runId: 'run-123',
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      publishVerified: true,
      effectiveBrowserMode: 'headless',
      personaId: 'persona-1',
      executionSettings: {
        headless: true,
        slowMo: 85,
        timeout: 30_000,
        navigationTimeout: 30_000,
        humanizeMouse: true,
        mouseJitter: 11,
        clickDelayMin: 45,
        clickDelayMax: 140,
        inputDelayMin: 35,
        inputDelayMax: 125,
        actionDelayMin: 250,
        actionDelayMax: 950,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
    });
  });

  it('forwards the Tradera listing form URL as the centralized engine startUrl', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: {
        title: 'Example',
        traderaConfig: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        },
      },
      connection: {} as never,
    });

    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          startUrl: 'https://www.tradera.com/en/selling/new',
        }),
        instance: expect.objectContaining({
          kind: 'programmable_listing',
        }),
      })
    );
  });

  it('forces headed troubleshooting runs through the engine config resolver', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {} as never,
      browserMode: 'headed',
    });

    const call = runPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
        settings: { headless: boolean };
      };
    };
    const resolved = call.resolveEngineRequestConfig(makeRuntime());

    expect(resolved.settings.headless).toBe(false);
  });

  it('applies runtime settings overrides on top of the resolved connection settings', async () => {
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
        settings: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );

    const result = await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {} as never,
      runtimeSettingsOverrides: {
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
    });

    const call = runPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
        settings: { emulateDevice: boolean; deviceName: string };
      };
    };
    const resolved = call.resolveEngineRequestConfig(makeRuntime());

    expect(resolved.settings).toMatchObject({
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
    expect(result.executionSettings).toMatchObject({
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
  });

  it('can skip startUrl bootstrap so Tradera scripts control sell-page navigation', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: {
        title: 'Example',
        traderaConfig: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        },
      },
      connection: {} as never,
      disableStartUrlBootstrap: true,
    });

    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'programmable_listing',
        }),
      })
    );
    expect(runPlaywrightConnectionEngineTaskMock.mock.calls[0]?.[0]?.request).not.toHaveProperty(
      'startUrl'
    );
  });

  it('preserves the Playwright run id when the centralized engine task fails', async () => {
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue(
      makeConnectionTaskResult({
        run: {
          runId: 'run-failed-1',
          status: 'failed',
          error: 'Script execution failed',
        },
      })
    );

    await expect(
      runPlaywrightListingScript({
        script: 'export default async function run() {}',
        input: { title: 'Example' },
        connection: {} as never,
      })
    ).rejects.toMatchObject({
      message: 'Script execution failed',
      meta: expect.objectContaining({
        runId: 'run-failed-1',
        runStatus: 'failed',
      }),
    });
  });
});
