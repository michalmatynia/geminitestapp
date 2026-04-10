import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  handleTraderaBrowserTestMock,
  getConnectionByIdAndIntegrationMock,
  updateConnectionMock,
} = vi.hoisted(() => ({
  handleTraderaBrowserTestMock: vi.fn(),
  getConnectionByIdAndIntegrationMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('../[id]/connections/[connectionId]/test/handler.tradera-browser', () => ({
  handleTraderaBrowserTest: (...args: unknown[]) => handleTraderaBrowserTestMock(...args),
}));

import {
  assertTraderaBrowserSessionReady,
  resetTraderaBrowserSessionPreflightCacheForTests,
  TRADERA_PREFLIGHT_CACHE_TTL_MS,
} from './tradera-browser-session-preflight';

describe('assertTraderaBrowserSessionReady', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T00:00:00.000Z'));
    resetTraderaBrowserSessionPreflightCacheForTests();

    getConnectionByIdAndIntegrationMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-tradera-1',
      playwrightStorageState: 'encrypted-state',
      playwrightStorageStateUpdatedAt: '2026-04-10T00:00:00.000Z',
    });
    handleTraderaBrowserTestMock.mockImplementation(async () =>
      Response.json({
        ok: true,
        sessionReady: true,
        steps: [],
      })
    );
  });

  it('reuses a recent successful preflight result for the same saved session', async () => {
    const integrationRepository = {
      getConnectionByIdAndIntegration: (...args: unknown[]) =>
        getConnectionByIdAndIntegrationMock(...args),
      updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
    };

    await assertTraderaBrowserSessionReady({
      integrationRepository,
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-1',
    });
    await assertTraderaBrowserSessionReady({
      integrationRepository,
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-1',
    });

    expect(handleTraderaBrowserTestMock).toHaveBeenCalledTimes(1);
  });

  it('reruns preflight after the cache TTL expires', async () => {
    const integrationRepository = {
      getConnectionByIdAndIntegration: (...args: unknown[]) =>
        getConnectionByIdAndIntegrationMock(...args),
      updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
    };

    await assertTraderaBrowserSessionReady({
      integrationRepository,
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-1',
    });

    vi.advanceTimersByTime(TRADERA_PREFLIGHT_CACHE_TTL_MS + 1);

    await assertTraderaBrowserSessionReady({
      integrationRepository,
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-1',
    });

    expect(handleTraderaBrowserTestMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    handleTraderaBrowserTestMock
      .mockResolvedValueOnce(
        Response.json(
          {
            ok: false,
            message:
              'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
            steps: [],
          },
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          sessionReady: true,
          steps: [],
        })
      );

    const integrationRepository = {
      getConnectionByIdAndIntegration: (...args: unknown[]) =>
        getConnectionByIdAndIntegrationMock(...args),
      updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
    };

    await expect(
      assertTraderaBrowserSessionReady({
        integrationRepository,
        integrationId: 'integration-tradera-1',
        connectionId: 'connection-1',
      })
    ).rejects.toMatchObject({
      message:
        'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.',
    });

    await assertTraderaBrowserSessionReady({
      integrationRepository,
      integrationId: 'integration-tradera-1',
      connectionId: 'connection-1',
    });

    expect(handleTraderaBrowserTestMock).toHaveBeenCalledTimes(2);
  });
});
