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

import { runPlaywrightConnectionScriptTask } from './script-task';

describe('playwright script task helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runPlaywrightConnectionEngineTaskMock.mockResolvedValue({
      runtime: {
        personaId: 'persona-1',
      },
      settings: {
        headless: true,
      },
      browserPreference: 'chrome',
      run: {
        runId: 'run-123',
        status: 'completed',
        result: {
          outputs: {
            result: {
              listingUrl: 'https://www.tradera.com/item/123',
              publishVerified: true,
            },
          },
          finalUrl: 'https://www.tradera.com/item/123',
        },
      },
    });
  });

  it('resolves outputs, resultValue, and finalUrl on top of the connection engine task result', async () => {
    const result = await runPlaywrightConnectionScriptTask({
      connection: {
        id: 'connection-1',
      } as never,
      request: {
        script: 'export default async function run() {}',
        browserEngine: 'chromium',
      },
      instance: {
        kind: 'programmable_listing',
        family: 'listing',
      },
    });

    expect(runPlaywrightConnectionEngineTaskMock).toHaveBeenCalledWith({
      connection: {
        id: 'connection-1',
      },
      request: {
        script: 'export default async function run() {}',
        browserEngine: 'chromium',
      },
      instance: {
        kind: 'programmable_listing',
        family: 'listing',
      },
    });
    expect(result).toMatchObject({
      runtime: {
        personaId: 'persona-1',
      },
      settings: {
        headless: true,
      },
      browserPreference: 'chrome',
      run: {
        runId: 'run-123',
        status: 'completed',
      },
      outputs: {
        result: {
          listingUrl: 'https://www.tradera.com/item/123',
          publishVerified: true,
        },
      },
      resultValue: {
        listingUrl: 'https://www.tradera.com/item/123',
        publishVerified: true,
      },
      finalUrl: 'https://www.tradera.com/item/123',
    });
  });
});
