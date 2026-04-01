import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient, resetApiClientGuardState } from '@/shared/lib/api-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers: Record<string, string>) => headers,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
  isLoggableObject: (error: unknown): boolean => typeof error === 'object' && error !== null,
}));

vi.mock('@/shared/utils/observability/trace', () => ({
  getTraceId: () => 'trace_test',
}));

describe('apiClient observability', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    resetApiClientGuardState();
    vi.stubGlobal('window', { location: { protocol: 'https:', host: 'example.com' } });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('logs request timeouts with standard error context and marks them as logged', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as typeof fetch;

    const request = apiClient('/api/products/metadata', {
      method: 'GET',
      timeout: 25,
    }).catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(25);
    const error = await request;

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Request timeout after 25ms');
    expect(logClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Request timeout after 25ms',
      }),
      expect.objectContaining({
        context: expect.objectContaining({
          endpoint: '/api/products/metadata',
          method: 'GET',
          traceId: 'trace_test',
        }),
      })
    );
    expect(
      vi.mocked(logClientError).mock.calls[0]?.[1]?.context as Record<string, unknown> | undefined
    ).not.toHaveProperty('level');
    expect(
      vi.mocked(logClientError).mock.calls[0]?.[1]?.context as Record<string, unknown> | undefined
    ).not.toHaveProperty('transientCandidate');
    expect((error as Error & { __logged?: boolean }).__logged).toBe(true);
  });

  it('keeps non-transient HTTP failures logged as errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Server unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    const error = await apiClient('/api/products/metadata', {
      method: 'GET',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Server unavailable');
    expect(logClientError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          endpoint: '/api/products/metadata',
          method: 'GET',
          status: 503,
          traceId: 'trace_test',
        }),
      })
    );
    expect(
      vi.mocked(logClientError).mock.calls[0]?.[1]?.context as Record<string, unknown> | undefined
    ).not.toHaveProperty('level');
    expect((error as ApiError & { __logged?: boolean }).__logged).toBe(true);
  });

  it('deduplicates concurrent browser GET requests to the same endpoint', async () => {
    let resolveFetch: ((value: Response) => void) | null = null;

    globalThis.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    ) as typeof fetch;

    const first = apiClient<{ ok: boolean }>('/api/products/metadata', {
      method: 'GET',
    });
    const second = apiClient<{ ok: boolean }>('/api/products/metadata', {
      method: 'GET',
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    resolveFetch?.(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
  });

  it('honors Retry-After cooldowns for browser GET requests after a 429 response', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Slow down' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '5',
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as typeof fetch;

    const firstError = await apiClient('/api/products/metadata', {
      method: 'GET',
    }).catch((error: unknown) => error);

    expect(firstError).toBeInstanceOf(ApiError);
    expect((firstError as ApiError).status).toBe(429);
    expect((firstError as ApiError).retryAfterMs).toBe(5000);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const cooldownError = await apiClient('/api/products/metadata', {
      method: 'GET',
    }).catch((error: unknown) => error);

    expect(cooldownError).toBeInstanceOf(ApiError);
    expect((cooldownError as ApiError).status).toBe(429);
    expect((cooldownError as ApiError).retryAfterMs).toBeGreaterThan(0);
    expect((cooldownError as ApiError & { __logged?: boolean }).__logged).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);

    await expect(
      apiClient<{ ok: boolean }>('/api/products/metadata', {
        method: 'GET',
      })
    ).resolves.toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
