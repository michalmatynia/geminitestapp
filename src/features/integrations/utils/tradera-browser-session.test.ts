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

import { ApiError } from '@/shared/lib/api-client';
import {
  TRADERA_BROWSER_MANUAL_TIMEOUT_MS,
  TRADERA_BROWSER_MANUAL_REQUEST_TIMEOUT_MS,
  TRADERA_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS,
  ensureTraderaBrowserSession,
  hasSavedTraderaBrowserSession,
  isTraderaBrowserAuthRequiredMessage,
  isTraderaBrowserSessionReady,
  preflightTraderaQuickListSession,
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
      },
      {
        timeout: TRADERA_BROWSER_MANUAL_REQUEST_TIMEOUT_MS,
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
      },
      {
        timeout: TRADERA_BROWSER_MANUAL_REQUEST_TIMEOUT_MS,
      }
    );
  });

  it('posts quicklist preflight with a dedicated fast mode and reports ready state', async () => {
    apiPostMock.mockResolvedValue({
      ok: true,
      sessionReady: true,
      steps: [{ step: 'Quicklist preflight', status: 'ok' }],
    });

    const result = await preflightTraderaQuickListSession({
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/integration-tradera-1/connections/conn-tradera-1/test',
      {
        mode: 'quicklist_preflight',
      },
      {
        timeout: TRADERA_BROWSER_QUICKLIST_PREFLIGHT_TIMEOUT_MS,
      }
    );
    expect(result.ready).toBe(true);
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

  it('derives quicklist readiness from sessionReady', () => {
    expect(
      isTraderaBrowserSessionReady({
        ok: true,
        sessionReady: true,
        steps: [],
      })
    ).toBe(true);
    expect(
      isTraderaBrowserSessionReady({
        ok: true,
        steps: [],
      })
    ).toBe(false);
  });

  it('surfaces captcha/manual-verification guidance from the connection-test step log', async () => {
    const apiError = new ApiError('Bad Request', 400);
    apiError.payload = {
      ok: false,
      steps: [
        {
          step: 'Captcha required',
          status: 'pending',
          timestamp: '2026-04-02T15:00:00.000Z',
          detail: 'Solve the captcha in the opened browser window to continue.',
        },
      ],
    };
    apiPostMock.mockRejectedValue(apiError);

    await expect(
      ensureTraderaBrowserSession({
        integrationId: 'integration-tradera-1',
        connectionId: 'conn-tradera-1',
      })
    ).rejects.toThrow(
      'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
    );
  });

  it('detects auth-required messages from captcha/manual-verification wording', () => {
    expect(
      isTraderaBrowserAuthRequiredMessage(
        'Tradera login requires manual verification. Solve the captcha in the opened browser window and retry.'
      )
    ).toBe(true);
    expect(
      isTraderaBrowserAuthRequiredMessage(
        'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification.'
      )
    ).toBe(true);
    expect(isTraderaBrowserAuthRequiredMessage('Unexpected network error')).toBe(false);
  });
});
