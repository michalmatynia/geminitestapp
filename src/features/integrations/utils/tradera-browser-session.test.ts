import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      post: (...args: unknown[]) => apiPostMock(...args) as Promise<unknown>,
    },
  };
});

import {
  TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
  ensureTraderaBrowserSession,
  hasSavedTraderaBrowserSession,
} from './tradera-browser-session';

describe('tradera-browser-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the manual login request with the default timeout and reports savedSession', async () => {
    apiPostMock.mockResolvedValue({
      ok: true,
      steps: [{ step: 'Saving session', status: 'ok' }],
    });

    const result = await ensureTraderaBrowserSession({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/integration-tradera-1/connections/conn-tradera-1/test',
      {
        mode: 'manual',
        manualTimeoutMs: TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
      }
    );
    expect(result.savedSession).toBe(true);
  });

  it('respects an explicit timeout override', async () => {
    apiPostMock.mockResolvedValue({ ok: true, steps: [] });

    await ensureTraderaBrowserSession({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
      manualTimeoutMs: 12345,
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/integration-tradera-1/connections/conn-tradera-1/test',
      {
        mode: 'manual',
        manualTimeoutMs: 12345,
      }
    );
  });

  it('derives savedSession from the Saving session step only', () => {
    expect(
      hasSavedTraderaBrowserSession({
        ok: true,
        steps: [{ step: 'Saving session', status: 'ok' }],
      })
    ).toBe(true);
    expect(
      hasSavedTraderaBrowserSession({
        ok: true,
        steps: [{ step: 'Manual login', status: 'ok' }],
      })
    ).toBe(false);
  });
});
