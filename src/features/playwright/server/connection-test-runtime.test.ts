import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolvePlaywrightConnectionRuntimeMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  resolvePlaywrightConnectionRuntimeMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('./connection-runtime', () => ({
  resolvePlaywrightConnectionRuntime: (...args: unknown[]) =>
    resolvePlaywrightConnectionRuntimeMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { resolvePlaywrightConnectionTestRuntime } from './connection-test-runtime';

describe('resolvePlaywrightConnectionTestRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves runtime and emits settings and stored-session steps', async () => {
    const pushStep = vi.fn();
    resolvePlaywrightConnectionRuntimeMock.mockResolvedValue({
      settings: { headless: true },
      storageState: { cookies: [], origins: [] },
    });

    const runtime = await resolvePlaywrightConnectionTestRuntime({
      connection: {
        id: 'connection-1',
        playwrightStorageState: 'stored-state',
      } as never,
      pushStep,
      settingsStep: {
        pendingDetail: 'Resolving browser runtime settings',
        successDetail: 'Resolved browser runtime settings',
        failureDetail: 'Failed to resolve Playwright settings',
      },
      storedSession: {
        loadedDetail: 'Stored session loaded',
        missingDetail: 'Failed to load session',
      },
    });

    expect(runtime).toEqual({
      settings: { headless: true },
      storageState: { cookies: [], origins: [] },
    });
    expect(pushStep).toHaveBeenNthCalledWith(
      1,
      'Loading Playwright settings',
      'pending',
      'Resolving browser runtime settings'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Loading session',
      'pending',
      'Loading stored Playwright session'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      3,
      'Loading session',
      'ok',
      'Stored session loaded'
    );
    expect(pushStep).toHaveBeenNthCalledWith(
      4,
      'Loading Playwright settings',
      'ok',
      'Resolved browser runtime settings'
    );
  });

  it('fails through the provided fail helper when settings resolution errors', async () => {
    const pushStep = vi.fn();
    const fail = vi.fn(async (step: string, detail: string) => {
      throw new Error(`${step}:${detail}`);
    });
    resolvePlaywrightConnectionRuntimeMock.mockRejectedValue(new Error('boom'));

    await expect(
      resolvePlaywrightConnectionTestRuntime({
        connection: { id: 'connection-1' } as never,
        pushStep,
        fail,
        settingsStep: {
          pendingDetail: 'Resolving browser runtime settings',
          successDetail: 'Resolved browser runtime settings',
          failureDetail: 'Failed to resolve Playwright settings',
        },
      })
    ).rejects.toThrow('Loading Playwright settings:Failed to resolve Playwright settings');

    expect(captureExceptionMock).toHaveBeenCalled();
    expect(fail).toHaveBeenCalledWith(
      'Loading Playwright settings',
      'Failed to resolve Playwright settings'
    );
  });

  it('rethrows when no fail helper is provided', async () => {
    const pushStep = vi.fn();
    resolvePlaywrightConnectionRuntimeMock.mockRejectedValue(new Error('boom'));

    await expect(
      resolvePlaywrightConnectionTestRuntime({
        connection: { id: 'connection-1' } as never,
        pushStep,
      })
    ).rejects.toThrow('boom');

    expect(captureExceptionMock).toHaveBeenCalled();
  });
});
