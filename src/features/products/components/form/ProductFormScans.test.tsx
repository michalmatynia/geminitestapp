/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  apiGetMock: vi.fn(),
  invalidateProductsCountsAndDetailMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => mocks.useProductFormCoreMock(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mocks.apiGetMock(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductsCountsAndDetail: (...args: unknown[]) =>
    mocks.invalidateProductsCountsAndDetailMock(...args),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

import ProductFormScans from './ProductFormScans';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('ProductFormScans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useProductFormCoreMock.mockReturnValue({
      product: { id: 'product-1' },
    });
  });

  it('shows completed scan update messages from asinUpdateMessage', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:00.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Product ASIN filled from Amazon scan.')).toBeInTheDocument();
    expect(screen.getByText('Amazon title')).toBeInTheDocument();
    expect(screen.getByText('ASIN B000123456 · Price $10.99')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledWith(
        expect.anything(),
        'product-1'
      );
    });
  });

  it('shows no-match info messages without treating them as errors', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-2',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'no_match',
          productName: 'Product 1',
          engineRunId: 'run-2',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          rawResult: null,
          error: 'Google reverse image search did not return a usable Amazon result.',
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: 'Google reverse image search did not return a usable Amazon result.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:00.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText('Google reverse image search did not return a usable Amazon result.')
    ).toBeInTheDocument();
  });

  it('shows a running status message for active scans without persisted update text', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          rawResult: null,
          error: null,
          asinUpdateStatus: 'pending',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: null,
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon reverse image scan running.')).toBeInTheDocument();
  });

  it('keeps the last scan results visible when a refresh fails after initial load', async () => {
    mocks.apiGetMock
      .mockResolvedValueOnce({
        scans: [
          {
            id: 'scan-4',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'completed',
            productName: 'Product 1',
            engineRunId: 'run-4',
            imageCandidates: [],
            matchedImageId: 'image-1',
            asin: 'B000123456',
            title: 'Amazon title',
            price: '$10.99',
            url: 'https://www.amazon.com/dp/B000123456',
            description: 'Amazon description',
            rawResult: null,
            error: null,
            asinUpdateStatus: 'updated',
            asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
            createdBy: null,
            updatedBy: null,
            completedAt: '2026-04-11T04:00:00.000Z',
            createdAt: '2026-04-11T03:59:00.000Z',
            updatedAt: '2026-04-11T04:00:00.000Z',
          },
        ],
      })
      .mockRejectedValueOnce(new Error('refresh failed'));

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(screen.getByText('refresh failed')).toBeInTheDocument();
    });

    expect(screen.getByText('Amazon title')).toBeInTheDocument();
    expect(screen.getByText('Product ASIN filled from Amazon scan.')).toBeInTheDocument();
  });

  it('does not re-invalidate product detail for the same updated scan on refresh', async () => {
    mocks.apiGetMock
      .mockResolvedValueOnce({
        scans: [
          {
            id: 'scan-5',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'completed',
            productName: 'Product 1',
            engineRunId: 'run-5',
            imageCandidates: [],
            matchedImageId: 'image-1',
            asin: 'B000123456',
            title: 'Amazon title',
            price: '$10.99',
            url: 'https://www.amazon.com/dp/B000123456',
            description: 'Amazon description',
            rawResult: null,
            error: null,
            asinUpdateStatus: 'updated',
            asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
            createdBy: null,
            updatedBy: null,
            completedAt: '2026-04-11T04:00:00.000Z',
            createdAt: '2026-04-11T03:59:00.000Z',
            updatedAt: '2026-04-11T04:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        scans: [
          {
            id: 'scan-5',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'completed',
            productName: 'Product 1',
            engineRunId: 'run-5',
            imageCandidates: [],
            matchedImageId: 'image-1',
            asin: 'B000123456',
            title: 'Amazon title',
            price: '$10.99',
            url: 'https://www.amazon.com/dp/B000123456',
            description: 'Amazon description',
            rawResult: null,
            error: null,
            asinUpdateStatus: 'updated',
            asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
            createdBy: null,
            updatedBy: null,
            completedAt: '2026-04-11T04:00:00.000Z',
            createdAt: '2026-04-11T03:59:00.000Z',
            updatedAt: '2026-04-11T04:00:00.000Z',
          },
        ],
      });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(2);
    });

    expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate product queries when the form already has the updated ASIN', async () => {
    mocks.useProductFormCoreMock.mockReturnValue({
      product: { id: 'product-1', asin: 'b000123456' },
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-6',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-6',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:00.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(1);
    });
    expect(mocks.invalidateProductsCountsAndDetailMock).not.toHaveBeenCalled();
  });

  it('retries product invalidation for the same updated scan after a transient invalidation failure', async () => {
    const invalidateDeferred = (() => {
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<void>((_resolve, rej) => {
        reject = rej;
      });
      return { promise, reject };
    })();
    const buildUpdatedScanResponse = () => ({
      scans: [
        {
          id: 'scan-7',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-7',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:00.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:00.000Z',
        },
      ],
    });

    mocks.invalidateProductsCountsAndDetailMock
      .mockImplementationOnce(async () => await invalidateDeferred.promise)
      .mockResolvedValueOnce(undefined);
    mocks.apiGetMock.mockImplementation(async () => buildUpdatedScanResponse());

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(2);
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      invalidateDeferred.reject(new Error('invalidate failed'));
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(3);
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(2);
    });
  });

  it('ignores stale invalidation completions after switching away from and back to a product', async () => {
    const pendingInvalidation = createDeferred<void>();
    let currentProduct = { id: 'product-1' };

    mocks.useProductFormCoreMock.mockImplementation(() => ({
      product: currentProduct,
    }));
    mocks.invalidateProductsCountsAndDetailMock
      .mockImplementationOnce(async () => await pendingInvalidation.promise)
      .mockResolvedValueOnce(undefined);
    mocks.apiGetMock.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/product-1/scans') {
        return {
          scans: [
            {
              id: 'scan-8',
              productId: 'product-1',
              provider: 'amazon',
              scanType: 'google_reverse_image',
              status: 'completed',
              productName: 'Product 1',
              engineRunId: 'run-8',
              imageCandidates: [],
              matchedImageId: 'image-1',
              asin: 'B000123456',
              title: 'Amazon title',
              price: '$10.99',
              url: 'https://www.amazon.com/dp/B000123456',
              description: 'Amazon description',
              rawResult: null,
              error: null,
              asinUpdateStatus: 'updated',
              asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
              createdBy: null,
              updatedBy: null,
              completedAt: '2026-04-11T04:00:00.000Z',
              createdAt: '2026-04-11T03:59:00.000Z',
              updatedAt: '2026-04-11T04:00:00.000Z',
            },
          ],
        };
      }

      if (url === '/api/v2/products/product-2/scans') {
        return { scans: [] };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
    });

    const queryClient = createQueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(1);
    });

    currentProduct = { id: 'product-2' };
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledWith('/api/v2/products/product-2/scans', {
        cache: 'no-store',
      });
    });

    currentProduct = { id: 'product-1' };
    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon title')).toBeInTheDocument();

    await act(async () => {
      pendingInvalidation.resolve(undefined);
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(4);
      expect(mocks.invalidateProductsCountsAndDetailMock).toHaveBeenCalledTimes(2);
    });
  });
});
