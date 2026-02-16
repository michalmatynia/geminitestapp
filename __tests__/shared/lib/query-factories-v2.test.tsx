import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as telemetry from '@/shared/lib/observability/tanstack-telemetry';
import {
  createCreateMutationV2,
  createListQueryV2,
  queryFactoriesV2TestUtils,
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
