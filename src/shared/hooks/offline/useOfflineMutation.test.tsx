// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

import {
  clearOfflineMutationQueue,
  processOfflineMutationQueue,
  useOfflineMutation,
} from './useOfflineMutation';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

describe('useOfflineMutation queued failure cleanup', () => {
  beforeEach(() => {
    toastMock.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    clearOfflineMutationQueue();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('invokes onFailed when a queued mutation replay fails permanently', async () => {
    const queryClient = createQueryClient();
    const mutationFn = vi.fn(async (): Promise<{ ok: true }> => {
      throw new Error('permanent failure');
    });
    const onQueued = vi.fn();
    const onFailed = vi.fn();
    const onProcessed = vi.fn();

    vi.stubGlobal('navigator', {
      ...window.navigator,
      onLine: false,
    });

    const { result } = renderHook(
      () =>
        useOfflineMutation(mutationFn, {
          queryKey: ['products', 'update'],
          onQueued,
          onFailed,
          onProcessed,
          queuedMessage: 'Queued',
          errorMessage: 'Failed',
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync('product-1');
    });

    expect(onQueued).toHaveBeenCalledWith('product-1', { queryClient });
    expect(onFailed).not.toHaveBeenCalled();
    expect(onProcessed).not.toHaveBeenCalled();

    vi.stubGlobal('navigator', {
      ...window.navigator,
      onLine: true,
    });

    await act(async () => {
      await processOfflineMutationQueue(queryClient);
    });

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(
      'product-1',
      { queryClient },
      expect.objectContaining({ message: 'permanent failure' })
    );
    expect(onProcessed).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('offline-mutation-queue')).toBeNull();
  });
});
