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
} from './client';

describe('kangur client observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
