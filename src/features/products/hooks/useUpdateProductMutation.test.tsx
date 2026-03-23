// @vitest-environment jsdom

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products';

const { invalidateProductsAndDetailMock, toastMock } = vi.hoisted(() => ({
  invalidateProductsAndDetailMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('./productCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./productCache')>();
  return {
    ...actual,
    invalidateProductsAndDetail: (...args: unknown[]) =>
      invalidateProductsAndDetailMock(...args),
  };
});

import { getProductDetailQueryKey } from './productCache';
import { useUpdateProductMutation } from './useProductData';

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

const createDeferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('useUpdateProductMutation', () => {
  beforeEach(() => {
    invalidateProductsAndDetailMock.mockReset();
    toastMock.mockReset();
    vi.stubGlobal('navigator', {
      ...window.navigator,
      onLine: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves form-data updates without waiting for product refetch invalidation', async () => {
    const queryClient = createQueryClient();
    const deferredInvalidation = createDeferred();
    invalidateProductsAndDetailMock.mockReturnValue(deferredInvalidation.promise);

    const savedProduct = {
      id: 'product-1',
      name: 'Updated product',
      sku: 'SKU-1',
    } as ProductWithImages;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(savedProduct), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useUpdateProductMutation(), {
      wrapper: createWrapper(queryClient),
    });

    const resolvedSpy = vi.fn();
    let mutationPromise!: Promise<ProductWithImages | null>;

    act(() => {
      mutationPromise = result.current.mutateAsync({
        id: 'product-1',
        data: new FormData(),
      });
      void mutationPromise.then(resolvedSpy);
    });

    await waitFor(() => {
      expect(resolvedSpy).toHaveBeenCalledTimes(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v2/products/product-1',
      expect.objectContaining({
        method: 'PUT',
        body: expect.any(FormData),
      })
    );
    expect(invalidateProductsAndDetailMock).toHaveBeenCalledWith(queryClient, 'product-1');
    expect(queryClient.getQueryData(getProductDetailQueryKey('product-1'))).toEqual(savedProduct);

    deferredInvalidation.resolve();
    await act(async () => {
      await mutationPromise;
    });
  });
});
