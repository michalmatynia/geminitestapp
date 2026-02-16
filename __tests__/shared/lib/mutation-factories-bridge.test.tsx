import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCreateMutation,
  createDeleteMutation,
  createSaveMutation,
  createUpdateMutation,
} from '@/shared/lib/mutation-factories';

import type { ReactElement, ReactNode } from 'react';

const createTestClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

describe('mutation-factories bridge', () => {
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
        createCreateMutation({
          createFn: async (payload: { name: string }) => ({ id: '1', name: payload.name }),
          invalidateFn,
        }),
      { wrapper }
    );

    await result.current.mutateAsync({ name: 'created' });
    expect(invalidateFn).toHaveBeenCalledTimes(1);
  });

  it('runs invalidate callback for save/update/delete variants', async () => {
    const invalidateFn = vi.fn();
    const saveHook = renderHook(
      () =>
        createSaveMutation({
          saveFn: async ({ id, data }: { id?: string; data: { name: string } }) => ({
            id: id ?? 'new',
            name: data.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          invalidateFn,
        }),
      { wrapper }
    );
    await saveHook.result.current.mutateAsync({ data: { name: 'save' } });

    const updateHook = renderHook(
      () =>
        createUpdateMutation({
          updateFn: async (payload: { id: string; data: { name: string } }) => payload,
          invalidateFn,
        }),
      { wrapper }
    );
    await updateHook.result.current.mutateAsync({ id: '1', data: { name: 'update' } });

    const deleteHook = renderHook(
      () =>
        createDeleteMutation({
          deleteFn: async (id: string) => ({ deleted: id }),
          invalidateFn,
        }),
      { wrapper }
    );
    await deleteHook.result.current.mutateAsync('1');

    expect(invalidateFn).toHaveBeenCalledTimes(3);
  });
});

