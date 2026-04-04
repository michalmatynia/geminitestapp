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

  it('logs failed API response payload details in client error context', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: 'An unexpected error occurred. Please try again later.',
            code: 'INTERNAL_SERVER_ERROR',
            fingerprint: 'fp-123',
            details: {
              recoveryAction: 'tradera_manual_login',
              currentUrl: 'https://www.tradera.com/en/verification',
            },
          }),
          {
            status: 500,
            statusText: 'Internal Server Error',
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );

    await expect(
      apiClient('/api/test-error', {
        method: 'POST',
      })
    ).rejects.toMatchObject({
      name: 'ApiError',
      message: 'An unexpected error occurred. Please try again later.',
      status: 500,
    });

    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ApiError',
        message: 'An unexpected error occurred. Please try again later.',
        status: 500,
      }),
      {
        context: expect.objectContaining({
          endpoint: '/api/test-error',
          method: 'POST',
          status: 500,
          traceId: 'trace-test',
          responseCode: 'INTERNAL_SERVER_ERROR',
          responseFingerprint: 'fp-123',
          responseDetails: {
            recoveryAction: 'tradera_manual_login',
            currentUrl: 'https://www.tradera.com/en/verification',
          },
          responsePayload: {
            error: 'An unexpected error occurred. Please try again later.',
            code: 'INTERNAL_SERVER_ERROR',
            fingerprint: 'fp-123',
            details: {
              recoveryAction: 'tradera_manual_login',
              currentUrl: 'https://www.tradera.com/en/verification',
            },
          },
        }),
      }
    );
  });
});
