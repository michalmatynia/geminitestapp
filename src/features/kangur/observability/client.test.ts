/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientErrorMock, setClientErrorBaseContextMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
  setClientErrorBaseContextMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
  setClientErrorBaseContext: setClientErrorBaseContextMock,
}));

import {
  clearKangurClientObservabilityContext,
  logKangurClientError,
  setKangurClientObservabilityContext,
  trackKangurClientEvent,
} from './client';

describe('kangur client observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/kangur/game?focus=clock');
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
  });

  it('logs client errors with Kangur default context tags', () => {
    const error = new Error('Kangur test error');

    logKangurClientError(error, {
      source: 'KangurGamePage',
      action: 'loadCurrentUser',
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          feature: 'kangur',
          service: 'kangur.client',
          source: 'KangurGamePage',
          action: 'loadCurrentUser',
        }),
      })
    );
  });

  it('sets page-specific Kangur context for centralized client logs', () => {
    setKangurClientObservabilityContext({
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });

    expect(setClientErrorBaseContextMock).toHaveBeenCalledWith({
      feature: 'kangur',
      kangur: {
        pageKey: 'Game',
        requestedPath: '/kangur/game',
      },
    });
  });

  it('clears Kangur-specific context on unmount/navigation', () => {
    clearKangurClientObservabilityContext();

    expect(setClientErrorBaseContextMock).toHaveBeenCalledWith({
      kangur: null,
    });
  });

  it('tracks Kangur analytics events with feature and page context', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    setKangurClientObservabilityContext({
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });

    trackKangurClientEvent('kangur_game_completed', {
      operation: 'addition',
      score: 9,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/events',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );

    const request = fetchMock.mock.calls[0]?.[1] as { body: string };
    const payload = JSON.parse(request.body);

    expect(payload).toMatchObject({
      type: 'event',
      name: 'kangur_game_completed',
      scope: 'public',
      path: '/kangur/game',
      search: '?focus=clock',
      meta: expect.objectContaining({
        feature: 'kangur',
        service: 'kangur.client',
        pageKey: 'Game',
        requestedPath: '/kangur/game',
        operation: 'addition',
        score: 9,
      }),
    });
  });
});
