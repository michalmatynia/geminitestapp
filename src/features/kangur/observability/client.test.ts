/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientErrorMock, setClientErrorBaseContextMock, captureExceptionMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
  setClientErrorBaseContextMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
  setClientErrorBaseContext: setClientErrorBaseContextMock,
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import {
  clearKangurClientObservabilityContext,
  isRecoverableKangurClientFetchError,
  logKangurClientError,
  setKangurClientObservabilityContext,
  trackKangurClientEvent,
  withKangurClientError,
  withKangurClientErrorSync,
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

  it('skips system capture and client reporting when shouldReport returns false', async () => {
    const authError = Object.assign(new Error('Authentication required'), { status: 401 });
    const onErrorMock = vi.fn();

    await expect(
      withKangurClientError(
        {
          source: 'kangur.auth',
          action: 'check-app-state',
          description: 'Fetches the current Kangur auth session.',
        },
        async () => {
          throw authError;
        },
        {
          fallback: null,
          shouldReport: () => false,
          onError: onErrorMock,
        }
      )
    ).resolves.toBeNull();

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalledWith(authError);
  });

  it('skips sync system capture and client reporting when shouldReport returns false', () => {
    const authError = Object.assign(new Error('Authentication required'), { status: 401 });
    const onErrorMock = vi.fn();

    expect(
      withKangurClientErrorSync(
        {
          source: 'kangur.auth',
          action: 'append-auth-mode',
          description: 'Adds auth mode to the Kangur login href.',
        },
        () => {
          throw authError;
        },
        {
          fallback: 'fallback',
          shouldReport: () => false,
          onError: onErrorMock,
        }
      )
    ).toBe('fallback');

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalledWith(authError);
  });

  it('still captures and reports unexpected errors', async () => {
    const unexpectedError = new Error('Unexpected failure');

    await expect(
      withKangurClientError(
        {
          source: 'kangur.auth',
          action: 'check-app-state',
          description: 'Fetches the current Kangur auth session.',
        },
        async () => {
          throw unexpectedError;
        },
        {
          fallback: null,
        }
      )
    ).resolves.toBeNull();

    expect(captureExceptionMock).toHaveBeenCalledWith(unexpectedError);
    expect(logClientErrorMock).toHaveBeenCalledWith(
      unexpectedError,
      expect.objectContaining({
        context: expect.objectContaining({
          feature: 'kangur',
          service: 'kangur.client',
          source: 'kangur.auth',
          action: 'check-app-state',
        }),
      })
    );
  });

  it('treats plain browser fetch failures as recoverable client load errors', () => {
    expect(isRecoverableKangurClientFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isRecoverableKangurClientFetchError(new TypeError('Network load failed'))
    ).toBe(true);
    expect(isRecoverableKangurClientFetchError(new Error('Failed to fetch'))).toBe(false);
    expect(isRecoverableKangurClientFetchError(new Error('Unexpected failure'))).toBe(false);
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
