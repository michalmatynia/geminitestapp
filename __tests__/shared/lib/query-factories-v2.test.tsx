import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as telemetry from '@/shared/lib/observability/tanstack-telemetry';
import {
  createCreateMutationV2,
  createMultiQueryV2,
  createMutationV2,
  createOptimisticMutationV2,
  createListQueryV2,
  ensureQueryDataV2,
  fetchQueryV2,
  prefetchQueryV2,
  queryFactoriesV2TestUtils,
  useEnsureQueryDataV2,
} from '@/shared/lib/query-factories-v2';

import type { ReactElement, ReactNode } from 'react';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('query-factories-v2', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
    telemetry.tanstackTelemetryTestUtils.reset();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('emits start and success lifecycle events for query factories', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);

    const { result } = renderHook(
      () =>
        createListQueryV2({
          queryKey: ['products'],
          queryFn: async () => [{ id: '1' }],
          meta: {
            source: 'products.hooks.useProducts',
            operation: 'list',
            resource: 'products',
            queryKey: ['products'],
            domain: 'products',
            samplingRate: 1,
          },
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'start',
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'success',
      })
    );
  });

  it('emits start and success lifecycle events for mutation factories', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);

    const { result } = renderHook(
      () =>
        createCreateMutationV2({
          mutationFn: async (value: { name: string }) => ({ id: '1', ...value }),
          meta: {
            source: 'products.hooks.useCreateProduct',
            operation: 'create',
            resource: 'products',
            mutationKey: ['products'],
            domain: 'products',
            samplingRate: 1,
          },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: 'New Product' });

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'mutation',
        stage: 'start',
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'mutation',
        stage: 'success',
      })
    );
  });

  it('emits query-batch telemetry for multi query factories', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);

    const { result } = renderHook(
      () =>
        createMultiQueryV2({
          queries: [
            {
              queryKey: ['products', 'batch', 'one'],
              queryFn: async () => ['a'],
              meta: {
                source: 'tests.shared.query-factories-v2.multi.one',
                operation: 'list',
                resource: 'products.batch-one',
              },
            },
            {
              queryKey: ['products', 'batch', 'two'],
              queryFn: async () => ({ id: '2' }),
              meta: {
                source: 'tests.shared.query-factories-v2.multi.two',
                operation: 'detail',
                resource: 'products.batch-two',
              },
            },
          ] as const,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query-batch',
        stage: 'start',
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query-batch',
        stage: 'success',
      })
    );
  });

  it('invalidates keys declared via invalidateKeys', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        createMutationV2<{ ok: boolean }, { id: string }>({
          mutationFn: async () => ({ ok: true }),
          mutationKey: ['products', 'mutation', 'invalidate-keys'],
          invalidateKeys: [['products'], ['products', 'detail']],
          meta: {
            source: 'tests.shared.query-factories-v2.invalidate-keys',
            operation: 'update',
            resource: 'products',
          },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ id: '1' });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['products', 'detail'] });
  });

  it('awaits invalidate before onSuccess', async () => {
    const executionOrder: string[] = [];

    const { result } = renderHook(
      () =>
        createMutationV2<{ ok: boolean }, void>({
          mutationFn: async () => ({ ok: true }),
          mutationKey: ['products', 'mutation', 'invalidate-order'],
          invalidate: async () => {
            await Promise.resolve();
            executionOrder.push('invalidate');
          },
          onSuccess: async () => {
            executionOrder.push('onSuccess');
          },
          meta: {
            source: 'tests.shared.query-factories-v2.invalidate-order',
            operation: 'update',
            resource: 'products',
          },
        }),
      { wrapper }
    );

    await result.current.mutateAsync();

    expect(executionOrder).toEqual(['invalidate', 'onSuccess']);
  });

  it('emits telemetry for prefetchQueryV2', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);

    const prefetch = prefetchQueryV2(queryClient, {
      queryKey: ['products', 'prefetch'],
      queryFn: async () => ['cached'],
      staleTime: 60_000,
      meta: {
        source: 'tests.shared.query-factories-v2.prefetch',
        operation: 'list',
        resource: 'products.prefetch',
      },
    });

    await prefetch();

    expect(queryClient.getQueryData(['products', 'prefetch'])).toEqual(['cached']);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'start',
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'success',
      })
    );
  });

  it('emits telemetry for fetchQueryV2 and rethrows transformed errors', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);
    const transformedError = new Error('normalized fetch error');

    const fetcher = fetchQueryV2(queryClient, {
      queryKey: ['products', 'fetch'],
      queryFn: async () => {
        throw new Error('boom');
      },
      meta: {
        source: 'tests.shared.query-factories-v2.fetch',
        operation: 'detail',
        resource: 'products.fetch',
      },
      transformError: () => transformedError,
    });

    await expect(fetcher()).rejects.toBe(transformedError);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'start',
      })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'error',
      })
    );
  });

  it('ensures query data and reuses cached data through ensureQueryDataV2', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);
    const fetcher = vi.fn(async () => ({ id: 'ensured' }));

    const ensure = ensureQueryDataV2(queryClient, {
      queryKey: ['products', 'ensure'],
      queryFn: fetcher,
      staleTime: 60_000,
      meta: {
        source: 'tests.shared.query-factories-v2.ensure',
        operation: 'detail',
        resource: 'products.ensure',
      },
    });

    await expect(ensure()).resolves.toEqual({ id: 'ensured' });
    await expect(ensure()).resolves.toEqual({ id: 'ensured' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['products', 'ensure'])).toEqual({ id: 'ensured' });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'success',
      })
    );
  });

  it('rethrows transformed errors from ensureQueryDataV2', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);
    const transformedError = new Error('normalized ensure error');

    const ensure = ensureQueryDataV2(queryClient, {
      queryKey: ['products', 'ensure-error'],
      queryFn: async () => {
        throw new Error('ensure boom');
      },
      meta: {
        source: 'tests.shared.query-factories-v2.ensure-error',
        operation: 'detail',
        resource: 'products.ensure-error',
      },
      transformError: () => transformedError,
    });

    await expect(ensure()).rejects.toBe(transformedError);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'error',
      })
    );
  });

  it('delegates useEnsureQueryDataV2 through the shared ensure helper behavior', async () => {
    const emitSpy = vi.spyOn(telemetry, 'emitTanstackTelemetry').mockReturnValue(true);
    const fetcher = vi.fn(async () => ({ id: 'hook-ensured' }));

    const { result } = renderHook(
      () =>
        useEnsureQueryDataV2({
          queryKey: ['products', 'ensure-hook'],
          queryFn: fetcher,
          staleTime: 60_000,
          meta: {
            source: 'tests.shared.query-factories-v2.ensure-hook',
            operation: 'detail',
            resource: 'products.ensure-hook',
          },
        }),
      { wrapper }
    );

    await expect(result.current()).resolves.toEqual({ id: 'hook-ensured' });
    await expect(result.current()).resolves.toEqual({ id: 'hook-ensured' });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(['products', 'ensure-hook'])).toEqual({ id: 'hook-ensured' });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'query',
        stage: 'success',
      })
    );
  });

  it('rolls back optimistic updates on mutation error', async () => {
    queryClient.setQueryData(['products', 'optimistic'], { count: 1 });

    const { result } = renderHook(
      () =>
        createOptimisticMutationV2<{ ok: boolean }, { delta: number }, { count: number }>({
          queryKey: ['products', 'optimistic'],
          updateFn: (oldData, variables) => ({
            count: (oldData?.count ?? 0) + variables.delta,
          }),
          mutationFn: async () => {
            throw new Error('boom');
          },
          meta: {
            source: 'tests.shared.query-factories-v2.optimistic',
            operation: 'update',
            resource: 'products.optimistic',
          },
        }),
      { wrapper }
    );

    await expect(result.current.mutateAsync({ delta: 2 })).rejects.toThrow('boom');
    expect(queryClient.getQueryData(['products', 'optimistic'])).toEqual({ count: 1 });
  });

  it('throws when required metadata is missing', () => {
    expect(() =>
      renderHook(
        () =>
          createListQueryV2({
            queryKey: ['products'],
            queryFn: async () => [{ id: '1' }],
            meta: {
              source: '',
              operation: 'list',
              resource: '',
            },
          }),
        { wrapper }
      )
    ).toThrow('[tanstack-factory-v2] Missing required meta fields');
  });

  it('guards invalid numeric refetch intervals to avoid polling loops', () => {
    expect(queryFactoriesV2TestUtils.sanitizeRefetchIntervalValue(0)).toBe(false);
    expect(queryFactoriesV2TestUtils.sanitizeRefetchIntervalValue(-10)).toBe(false);
    expect(queryFactoriesV2TestUtils.sanitizeRefetchIntervalValue(Number.NaN)).toBe(false);
    expect(queryFactoriesV2TestUtils.sanitizeRefetchIntervalValue(1000)).toBe(1000);
  });

  it('guards throwing refetch interval callbacks to prevent refetch churn', () => {
    const rawRefetchInterval = vi.fn((_query: unknown) => {
      throw new Error('interval callback failed');
    });
    const guarded = queryFactoriesV2TestUtils.guardRefetchInterval(rawRefetchInterval);

    expect(typeof guarded).toBe('function');
    if (typeof guarded !== 'function') return;

    expect(guarded({ options: { enabled: true } })).toBe(false);
    expect(rawRefetchInterval).toHaveBeenCalledTimes(1);
  });

  it('disables refetch interval callbacks when query enabled resolves to false', () => {
    const rawRefetchInterval = vi.fn((_query: unknown) => 100);
    const guarded = queryFactoriesV2TestUtils.guardRefetchInterval(rawRefetchInterval);

    expect(typeof guarded).toBe('function');
    if (typeof guarded !== 'function') return;

    expect(
      guarded({
        options: {
          enabled: () => false,
        },
      })
    ).toBe(false);
    expect(rawRefetchInterval).not.toHaveBeenCalled();
  });
});
