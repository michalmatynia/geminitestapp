import { describe, expect, it, vi, beforeEach } from 'vitest';

import { emitTanstackTelemetry, getTanstackFactoryMetaFromBag } from '@/shared/lib/observability/tanstack-telemetry';
import { createQueryClient } from '@/shared/lib/query-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(),
  isLoggableObject: (error: unknown): boolean => typeof error === 'object' && error !== null,
}));

vi.mock('@/shared/lib/observability/tanstack-telemetry', () => ({
  emitTanstackTelemetry: vi.fn(),
  getTanstackFactoryMetaFromBag: vi.fn(() => null),
}));

describe('createQueryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies retry policy for queries', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;

    expect(typeof retry).toBe('function');
    if (typeof retry !== 'function') return;

    expect(retry(0, { status: 404 } as unknown as Error)).toBe(false);
    expect(retry(0, { status: 500 } as unknown as Error)).toBe(true);
    expect(retry(2, { status: 500 } as unknown as Error)).toBe(false);
    expect(retry(0, new Error('Request timeout after 5000ms'))).toBe(true);
    expect(retry(2, new Error('Network error'))).toBe(false);
  });

  it('applies retry policy for mutations', () => {
    const client = createQueryClient();
    const retry = client.getDefaultOptions().mutations?.retry;

    expect(typeof retry).toBe('function');
    if (typeof retry !== 'function') return;

    expect(retry(0, { status: 422 } as unknown as Error)).toBe(false);
    expect(retry(0, { status: 503 } as unknown as Error)).toBe(true);
    expect(retry(1, { status: 503 } as unknown as Error)).toBe(false);
    expect(retry(0, new Error('Failed to fetch'))).toBe(true);
    expect(retry(1, new Error('Failed to fetch'))).toBe(false);
  });

  it('logs normalized context for query cache errors', () => {
    const client = createQueryClient();
    const onError = client.getQueryCache().config.onError;

    expect(typeof onError).toBe('function');
    if (typeof onError !== 'function') return;

    const error = new Error('query failed');
    onError(error, {
      queryKey: ['products', 'metadata', 'catalogs'],
      state: { fetchFailureCount: 3 },
    } as unknown as Parameters<NonNullable<typeof onError>>[1]);

    expect(logClientError).toHaveBeenCalledTimes(1);
    expect(logClientError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'QueryCache',
          key: JSON.stringify(['products', 'metadata', 'catalogs']),
          attempt: 3,
          statusCode: null,
          queryKey: ['products', 'metadata', 'catalogs'],
        }),
      })
    );
    expect(emitTanstackTelemetry).toHaveBeenCalledTimes(1);
  });

  it('logs normalized context for mutation cache errors and never throws', () => {
    const client = createQueryClient();
    const onError = client.getMutationCache().config.onError;

    expect(typeof onError).toBe('function');
    if (typeof onError !== 'function') return;

    const error = Object.assign(new Error('mutation failed'), { status: 500 });
    onError(
      error,
      undefined,
      undefined,
      {
        options: { mutationKey: ['products', 'settings', 'save'] },
        state: { failureCount: 2 },
      } as unknown as Parameters<NonNullable<typeof onError>>[3],
      undefined as unknown as Parameters<NonNullable<typeof onError>>[4]
    );

    expect(logClientError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'MutationCache',
          key: JSON.stringify(['products', 'settings', 'save']),
          attempt: 2,
          statusCode: 500,
          mutationKey: ['products', 'settings', 'save'],
        }),
      })
    );
    expect(emitTanstackTelemetry).toHaveBeenCalledTimes(1);

    vi.mocked(logClientError).mockImplementationOnce(() => {
      throw new Error('logger failed');
    });

    expect(() =>
      onError(
        new Error('secondary error'),
        undefined,
        undefined,
        {
          options: { mutationKey: ['x'] },
          state: { failureCount: 1 },
        } as unknown as Parameters<NonNullable<typeof onError>>[3],
        undefined as unknown as Parameters<NonNullable<typeof onError>>[4]
      )
    ).not.toThrow();
  });

  it('skips fallback telemetry when factory metadata is present', () => {
    vi.mocked(getTanstackFactoryMetaFromBag).mockReturnValueOnce({
      source: 'products.hooks.useProducts',
      operation: 'list',
      resource: 'products',
      key: ['products'],
      criticality: 'normal',
      samplingRate: 1,
      domain: 'products',
      tags: ['products'],
    });
    const client = createQueryClient();
    const onError = client.getQueryCache().config.onError;
    expect(typeof onError).toBe('function');
    if (typeof onError !== 'function') return;

    onError(
      new Error('factory error'),
      {
        queryKey: ['products'],
        state: { fetchFailureCount: 1 },
        meta: { tanstackFactoryV2Meta: { source: 'x' } },
      } as unknown as Parameters<NonNullable<typeof onError>>[1]
    );

    expect(emitTanstackTelemetry).not.toHaveBeenCalled();
  });
});
