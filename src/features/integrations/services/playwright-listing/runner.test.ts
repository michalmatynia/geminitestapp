import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedPlaywrightConnectionRuntime } from '@/features/playwright/server';

const { runPlaywrightConnectionScriptTaskMock } = vi.hoisted(() => ({
  runPlaywrightConnectionScriptTaskMock: vi.fn(),
}));

vi.mock('@/features/playwright/server/script-task', () => ({
  runPlaywrightConnectionScriptTask: (input: Record<string, unknown>) =>
    runPlaywrightConnectionScriptTaskMock(input) as Promise<unknown>,
}));

import {
  runPlaywrightListingScript,
  runPlaywrightProgrammableImportForConnection,
  runPlaywrightProgrammableListingForConnection,
} from '@/features/playwright/server/programmable';

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
}) => {
  const run = {
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
  };
  const payloadRecord =
    run.result && typeof run.result === 'object' && !Array.isArray(run.result)
      ? (run.result as Record<string, unknown>)
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
    runtime: makeRuntime(overrides?.runtime),
    settings: {
      ...defaultRuntimeSettings,
      ...(overrides?.settings ?? {}),
    },
    browserPreference:
      overrides?.runtime?.browserPreference ??
      overrides?.runtime?.settings?.browser ??
      defaultRuntimeSettings.browser,
    run,
    outputs,
    resultValue,
    finalUrl:
      typeof payloadRecord['finalUrl'] === 'string' ? payloadRecord['finalUrl'].trim() : null,
  };
};

describe('runPlaywrightListingScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue(makeConnectionTaskResult());
  });

  it('passes the connection browser preference through the engine config resolver', async () => {
    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example' },
      connection: {} as never,
    });

    const call = runPlaywrightConnectionScriptTaskMock.mock.calls[0]?.[0] as {
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

    const call = runPlaywrightConnectionScriptTaskMock.mock.calls[0]?.[0] as {
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
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue(
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

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
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

  it('supports explicit engine instance overrides for non-programmable listing flows', async () => {
    const instance = {
      kind: 'tradera_scripted_listing',
      family: 'listing',
      label: 'Tradera scripted listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
    } as const;

    await runPlaywrightListingScript({
      script: 'export default async function run() {}',
      input: { title: 'Example', listingId: 'listing-1' },
      connection: {
        id: 'connection-1',
        integrationId: 'integration-1',
      } as never,
      instance,
    });

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance,
      })
    );
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

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
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

    const call = runPlaywrightConnectionScriptTaskMock.mock.calls[0]?.[0] as {
      resolveEngineRequestConfig: (runtime: ResolvedPlaywrightConnectionRuntime) => {
        settings: { headless: boolean };
      };
    };
    const resolved = call.resolveEngineRequestConfig(makeRuntime());

    expect(resolved.settings.headless).toBe(false);
  });

  it('applies runtime settings overrides on top of the resolved connection settings', async () => {
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue(
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

    const call = runPlaywrightConnectionScriptTaskMock.mock.calls[0]?.[0] as {
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

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instance: expect.objectContaining({
          kind: 'programmable_listing',
        }),
      })
    );
    expect(runPlaywrightConnectionScriptTaskMock.mock.calls[0]?.[0]?.request).not.toHaveProperty(
      'startUrl'
    );
  });

  it('preserves the Playwright run id when the centralized engine task fails', async () => {
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue(
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

describe('runPlaywrightProgrammableListingForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue(makeConnectionTaskResult());
  });

  it('resolves the connection listing script and runs it through the centralized programmable adapter', async () => {
    const result = await runPlaywrightProgrammableListingForConnection({
      connection: {
        id: 'connection-1',
        integrationId: 'integration-1',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      input: {
        title: 'Example',
      },
      browserMode: 'headed',
    });

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          script: 'export default async function run() {}',
          input: {
            title: 'Example',
          },
        }),
        instance: expect.objectContaining({
          kind: 'programmable_listing',
        }),
      })
    );
    expect(result).toMatchObject({
      runId: 'run-123',
      externalListingId: 'listing-123',
      effectiveBrowserMode: 'headless',
    });
  });

  it('fails early when the connection has no programmable listing script', async () => {
    await expect(
      runPlaywrightProgrammableListingForConnection({
        connection: {
          id: 'connection-1',
          integrationId: 'integration-1',
          playwrightListingScript: null,
        } as never,
        input: {
          title: 'Example',
        },
      })
    ).rejects.toThrow('This connection does not have a Playwright listing script configured.');

    expect(runPlaywrightConnectionScriptTaskMock).not.toHaveBeenCalled();
  });
});

describe('runPlaywrightProgrammableImportForConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionScriptTaskMock.mockResolvedValue({
      run: {
        runId: 'run-import-123',
        status: 'completed',
      },
      outputs: {
        result: [
          {
            sku: 'PW-001',
            title: 'Programmable import product',
          },
        ],
      },
    });
  });

  it('resolves the connection import script and runs it through the centralized programmable adapter', async () => {
    const result = await runPlaywrightProgrammableImportForConnection({
      connection: {
        id: 'connection-1',
        integrationId: 'integration-1',
        playwrightImportScript: 'export default async function run() {}',
      } as never,
      input: {
        baseUrl: 'https://example.com',
      },
    });

    expect(runPlaywrightConnectionScriptTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          script: 'export default async function run() {}',
          input: {
            baseUrl: 'https://example.com',
          },
        }),
        instance: expect.objectContaining({
          kind: 'programmable_import',
        }),
      })
    );
    expect(result).toEqual({
      products: [
        {
          sku: 'PW-001',
          title: 'Programmable import product',
        },
      ],
      rawResult: {
        result: [
          {
            sku: 'PW-001',
            title: 'Programmable import product',
          },
        ],
      },
    });
  });

  it('fails early when the connection has no programmable import script', async () => {
    await expect(
      runPlaywrightProgrammableImportForConnection({
        connection: {
          id: 'connection-1',
          integrationId: 'integration-1',
          playwrightImportScript: null,
        } as never,
        input: {
          baseUrl: 'https://example.com',
        },
      })
    ).rejects.toThrow('This connection does not have a Playwright import script configured.');

    expect(runPlaywrightConnectionScriptTaskMock).not.toHaveBeenCalled();
  });
});
