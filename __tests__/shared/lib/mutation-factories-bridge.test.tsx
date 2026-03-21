import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCreateMutationV2,
  createDeleteMutationV2,
  createUpdateMutationV2,
} from '@/shared/lib/query-factories-v2';

import type { ReactElement, ReactNode } from 'react';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

describe('mutation-factories-v2', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestClient();
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('runs invalidate callback for create mutation', async () => {
    const invalidateFn = vi.fn();
    const { result } = renderHook(
      () =>
        createCreateMutationV2<{ id: string; name: string }, { name: string }>({
          mutationFn: async (payload: { name: string }) => ({ id: '1', name: payload.name }),
          meta: {
            source: 'tests.shared.mutation-factories-v2.create',
            operation: 'create',
            resource: 'entity',
          },
          onSuccess: () => {
            invalidateFn();
          },
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: 'created' });
    expect(invalidateFn).toHaveBeenCalledTimes(1);
  });

  it('runs invalidate callback for update/delete variants', async () => {
    const invalidateFn = vi.fn();
    const updateHook = renderHook(
      () =>
        createUpdateMutationV2<
          { id: string; data: { name: string } },
          { id: string; data: { name: string } }
        >({
          mutationFn: async (payload: { id: string; data: { name: string } }) => payload,
          meta: {
            source: 'tests.shared.mutation-factories-v2.update',
            operation: 'update',
            resource: 'entity',
          },
          onSuccess: () => {
            invalidateFn();
          },
        }),
      { wrapper }
    );
    await updateHook.result.current.mutateAsync({ id: '1', data: { name: 'update' } });

    const deleteHook = renderHook(
      () =>
        createDeleteMutationV2<{ deleted: string }, string>({
          mutationFn: async (id: string) => ({ deleted: id }),
          meta: {
            source: 'tests.shared.mutation-factories-v2.delete',
            operation: 'delete',
            resource: 'entity',
          },
          onSuccess: () => {
            invalidateFn();
          },
        }),
      { wrapper }
    );
    await deleteHook.result.current.mutateAsync('1');

    expect(invalidateFn).toHaveBeenCalledTimes(2);
  });
});
