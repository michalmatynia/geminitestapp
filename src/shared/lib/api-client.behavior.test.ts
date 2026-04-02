import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withCsrfHeadersMock,
  logClientErrorMock,
  isLoggableObjectMock,
  getTraceIdMock,
} = vi.hoisted(() => ({
  withCsrfHeadersMock: vi.fn((headers: Record<string, string>) => headers),
  logClientErrorMock: vi.fn(),
  isLoggableObjectMock: vi.fn(() => false),
  getTraceIdMock: vi.fn(() => 'trace-test'),
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: withCsrfHeadersMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
  isLoggableObject: isLoggableObjectMock,
}));

vi.mock('@/shared/utils/observability/trace', () => ({
  getTraceId: getTraceIdMock,
}));

import { apiClient, resetApiClientGuardState } from './api-client';

describe('apiClient timeout behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetApiClientGuardState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetApiClientGuardState();
  });

  it('aborts the underlying fetch when the request timeout elapses', async () => {
    let observedSignal: AbortSignal | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn((_input: unknown, init?: RequestInit) => {
        observedSignal = init?.signal as AbortSignal | undefined;

        return new Promise<Response>((_resolve, reject) => {
          const rejectAbort = (): void => {
            const abortError = new Error('Request aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          };

          if (!observedSignal) {
            return;
          }

          if (observedSignal.aborted) {
            rejectAbort();
            return;
          }

          observedSignal.addEventListener('abort', rejectAbort, { once: true });
        });
      })
    );

    const requestPromise = apiClient('/api/test-timeout', {
      timeout: 10,
      logError: false,
    });
    const timeoutExpectation = expect(requestPromise).rejects.toThrow('Request timeout after 10ms');

    await vi.advanceTimersByTimeAsync(10);

    await timeoutExpectation;
    expect(observedSignal?.aborted).toBe(true);
  });
});
