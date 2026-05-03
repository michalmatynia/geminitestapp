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

let clearKangurClientObservabilityContext: typeof import('./client').clearKangurClientObservabilityContext;
let isExpectedKangurClientError: typeof import('../client').isExpectedKangurClientError;
let isRecoverableKangurClientFetchError: typeof import('../client').isRecoverableKangurClientFetchError;
let logKangurClientError: typeof import('../client').logKangurClientError;
let setKangurClientObservabilityContext: typeof import('../client').setKangurClientObservabilityContext;
let trackKangurClientEvent: typeof import('../client').trackKangurClientEvent;
let withKangurClientError: typeof import('../client').withKangurClientError;
let withKangurClientErrorSync: typeof import('../client').withKangurClientErrorSync;

describe('kangur client observability', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    window.history.replaceState({}, '', '/kangur/game?focus=clock');
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
    ({
      clearKangurClientObservabilityContext,
      isExpectedKangurClientError,
      isRecoverableKangurClientFetchError,
      logKangurClientError,
      setKangurClientObservabilityContext,
      trackKangurClientEvent,
      withKangurClientError,
      withKangurClientErrorSync,
    } = await import('../client'));
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

  it('skips system capture and client reporting for expected API errors by default', async () => {
    const validationError = Object.assign(
      new Error('Please review the highlighted fields and try again.'),
      { status: 400 }
    );

    await expect(
      withKangurClientError(
        {
          source: 'kangur.games',
          action: 'fetch-library-coverage',
          description: 'Loads the Kangur game library coverage groups.',
        },
        async () => {
          throw validationError;
        },
        {
          fallback: null,
        }
      )
    ).resolves.toBeNull();

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });

  it('skips system capture and client reporting for Kangur API proxy misses', async () => {
    const proxyError = Object.assign(new Error('Kangur API proxy request failed.'), {
      status: 502,
    });

    await expect(
      withKangurClientError(
        {
          source: 'kangur.lesson-sections',
          action: 'fetch-sections',
          description: 'Loads Kangur lesson sections from the API.',
        },
        async () => {
          throw proxyError;
        },
        {
          fallback: [],
        }
      )
    ).resolves.toEqual([]);

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
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

  it('skips sync system capture and client reporting for expected API errors by default', () => {
    const validationError = Object.assign(
      new Error('Please review the highlighted fields and try again.'),
      { status: 400 }
    );

    expect(
      withKangurClientErrorSync(
        {
          source: 'kangur.games',
          action: 'resolve-library-coverage',
          description: 'Resolves the Kangur game library coverage payload.',
        },
        () => {
          throw validationError;
        },
        {
          fallback: 'fallback',
        }
      )
    ).toBe('fallback');

    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(logClientErrorMock).not.toHaveBeenCalled();
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

  it('treats fetch-style network failures as recoverable client load errors', () => {
    expect(isRecoverableKangurClientFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(
      isRecoverableKangurClientFetchError(new TypeError('Network load failed'))
    ).toBe(true);
    expect(isRecoverableKangurClientFetchError(new Error('Failed to fetch'))).toBe(true);
    expect(isRecoverableKangurClientFetchError({ message: 'Failed to fetch' })).toBe(true);
    expect(isRecoverableKangurClientFetchError('Failed to fetch')).toBe(true);
    expect(isRecoverableKangurClientFetchError(new Error('Failed to fetch resource'))).toBe(true);
    expect(
      isRecoverableKangurClientFetchError(new Error('Request timeout after 30000ms'))
    ).toBe(true);
    expect(
      isRecoverableKangurClientFetchError(new Error('Response body timeout after 30000ms'))
    ).toBe(true);
    expect(
      isRecoverableKangurClientFetchError({ message: 'Request timeout after 30000ms' })
    ).toBe(true);
    expect(isRecoverableKangurClientFetchError('Request timeout after 30000ms')).toBe(true);
    expect(
      isRecoverableKangurClientFetchError(
        Object.assign(new Error('Kangur API proxy request failed.'), { status: 502 })
      )
    ).toBe(true);
    expect(isRecoverableKangurClientFetchError(new Error('Unexpected failure'))).toBe(false);
  });

  it('treats 4xx API-style errors as expected client errors', () => {
    expect(
      isExpectedKangurClientError(
        Object.assign(new Error('Please review the highlighted fields and try again.'), {
          status: 400,
        })
      )
    ).toBe(true);
    expect(
      isExpectedKangurClientError(
        Object.assign(new Error('Your session has expired.'), {
          status: 401,
        })
      )
    ).toBe(true);
    expect(
      isExpectedKangurClientError(
        Object.assign(new Error('Unexpected failure'), {
          status: 500,
        })
      )
    ).toBe(false);
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
