/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  toast: vi.fn(),
  safeSetInterval: vi.fn(),
  safeClearInterval: vi.fn(),
  pollCallback: null as null | (() => void),
  invalidateProductsAndDetail: vi.fn().mockResolvedValue(undefined),
  invalidateProductsAndCounts: vi.fn().mockResolvedValue(undefined),
  invalidateProductScans: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => mocks.apiPost(...args),
    get: (...args: unknown[]) => mocks.apiGet(...args),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateProductsAndDetail: (...args: unknown[]) =>
    mocks.invalidateProductsAndDetail(...args),
  invalidateProductsAndCounts: (...args: unknown[]) =>
    mocks.invalidateProductsAndCounts(...args),
  invalidateProductScans: (...args: unknown[]) =>
    mocks.invalidateProductScans(...args),
}));

vi.mock('@/shared/lib/timers', () => ({
  safeSetInterval: (...args: unknown[]) => {
    const callback = args[0];
    if (typeof callback === 'function') {
      mocks.pollCallback = callback as () => void;
    } else {
      mocks.pollCallback = null;
    }
    return mocks.safeSetInterval(...args);
  },
  safeClearInterval: (...args: unknown[]) => mocks.safeClearInterval(...args),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    isOpen,
    title,
    subtitle,
    headerActions,
    children,
  }: {
    isOpen: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    headerActions?: React.ReactNode;
    children: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid='app-modal'>
        <div data-testid='modal-title'>{title}</div>
        <div data-testid='modal-subtitle'>{subtitle}</div>
        <div data-testid='modal-header-actions'>{headerActions}</div>
        <div data-testid='modal-content'>{children}</div>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

import { ProductAmazonScanModal } from './ProductAmazonScanModal';

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

describe('ProductAmazonScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeSetInterval.mockImplementation(() => 1);
    mocks.safeClearInterval.mockImplementation(() => undefined);
    mocks.pollCallback = null;
  });

  it('replaces the queued message with the completed ASIN update message and invalidates scans', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
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

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/scans/amazon/batch',
        { productIds: ['product-1'] }
      );
    });

    await screen.findByText('Product ASIN filled from Amazon scan.');

    expect(screen.getByText('Amazon title')).toBeInTheDocument();
    expect(screen.queryByText('Amazon reverse image scan queued.')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.invalidateProductsAndDetail).toHaveBeenCalledWith(
        expect.anything(),
        'product-1'
      );
      expect(mocks.invalidateProductsAndCounts).toHaveBeenCalledWith(expect.anything());
      expect(mocks.invalidateProductScans).toHaveBeenCalledWith(
        expect.anything(),
        'product-1'
      );
    });
  });

  it('replaces the queued message with a running message after sync advances the scan', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-1',
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

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('Amazon reverse image scan running.');
    expect(screen.queryByText('Amazon reverse image scan queued.')).not.toBeInTheDocument();
  });

  it('shows a running state immediately when the batch response returns a started scan', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'running',
          message: 'Amazon reverse image scan running.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-1',
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

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('Amazon reverse image scan running.');
    expect(mocks.toast).toHaveBeenCalledWith('Amazon scans: 1 running.', {
      variant: 'success',
    });
  });

  it('shows a toast when manual refresh fails', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet.mockRejectedValue(new Error('scan refresh failed'));

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/scans/amazon/batch',
        { productIds: ['product-1'] }
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith('scan refresh failed', {
        variant: 'error',
      });
    });
  });

  it('shows a toast and stops polling when the initial post-enqueue refresh fails', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet.mockRejectedValue(new Error('initial scan refresh failed'));

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/scans/amazon/batch',
        { productIds: ['product-1'] }
      );
      expect(mocks.safeSetInterval).toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith('initial scan refresh failed', {
        variant: 'error',
      });
      expect(mocks.safeClearInterval).toHaveBeenCalled();
    });
  });

  it('marks products as failed when the batch response omits them', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'queued',
          productName: 'Product 1',
          engineRunId: 'run-1',
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

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1', 'product-2']}
          products={[
            { id: 'product-1', name_en: 'Product 1', images: [] } as never,
            { id: 'product-2', name_en: 'Product 2', images: [] } as never,
          ]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('Amazon scan request did not return a result for this product.');
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Amazon scans: 1 queued, 1 failed.', {
      variant: 'warning',
    });
  });

  it('marks a queued scan as failed when its record disappears during refresh', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet.mockResolvedValue({ scans: [] });

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('Amazon scan record could not be refreshed.');
    expect(screen.queryByText('Amazon reverse image scan queued.')).not.toBeInTheDocument();
    expect(mocks.safeClearInterval).toHaveBeenCalled();
  });

  it('shows a toast and stops polling when background refresh fails', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet.mockRejectedValue(new Error('automatic scan refresh failed'));

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith(
        '/api/v2/products/scans/amazon/batch',
        { productIds: ['product-1'] }
      );
      expect(mocks.safeSetInterval).toHaveBeenCalled();
      expect(mocks.pollCallback).not.toBeNull();
    });

    await act(async () => {
      mocks.pollCallback?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith('automatic scan refresh failed', {
        variant: 'error',
      });
      expect(mocks.safeClearInterval).toHaveBeenCalled();
    });
  });

  it('ignores stale enqueue responses from a previous modal session', async () => {
    const firstResponse = createDeferred<{
      queued: number;
      running: number;
      alreadyRunning: number;
      failed: number;
      results: Array<{
        productId: string;
        scanId: string | null;
        runId: string | null;
        status: 'failed';
        message: string;
      }>;
    }>();

    mocks.apiPost
      .mockImplementationOnce(async () => await firstResponse.promise)
      .mockResolvedValueOnce({
        queued: 0,
        running: 0,
        alreadyRunning: 0,
        failed: 1,
        results: [
          {
            productId: 'product-2',
            scanId: null,
            runId: null,
            status: 'failed',
            message: 'fresh failure',
          },
        ],
      });

    const queryClient = createQueryClient();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenNthCalledWith(1, '/api/v2/products/scans/amazon/batch', {
        productIds: ['product-1'],
      });
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen={false}
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-2']}
          products={[{ id: 'product-2', name_en: 'Product 2', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenNthCalledWith(2, '/api/v2/products/scans/amazon/batch', {
        productIds: ['product-2'],
      });
    });

    await screen.findByText('fresh failure');
    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();

    await act(async () => {
      firstResponse.resolve({
        queued: 0,
        running: 0,
        alreadyRunning: 0,
        failed: 1,
        results: [
          {
            productId: 'product-1',
            scanId: null,
            runId: null,
            status: 'failed',
            message: 'stale failure',
          },
        ],
      });
      await Promise.resolve();
    });

    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
    expect(screen.queryByText('stale failure')).not.toBeInTheDocument();
  });

  it('ignores stale refresh failures from a previous modal session', async () => {
    const staleRefresh = createDeferred<never>();

    mocks.apiPost
      .mockResolvedValueOnce({
        queued: 1,
        running: 0,
        alreadyRunning: 0,
        failed: 0,
        results: [
          {
            productId: 'product-1',
            scanId: 'scan-1',
            runId: 'run-1',
            status: 'queued',
            message: 'Amazon reverse image scan queued.',
          },
        ],
      })
      .mockResolvedValueOnce({
        queued: 0,
        running: 0,
        alreadyRunning: 0,
        failed: 1,
        results: [
          {
            productId: 'product-2',
            scanId: null,
            runId: null,
            status: 'failed',
            message: 'fresh failure',
          },
        ],
      });
    mocks.apiGet.mockImplementationOnce(async () => await staleRefresh.promise);

    const queryClient = createQueryClient();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenNthCalledWith(1, '/api/v2/products/scans/amazon/batch', {
        productIds: ['product-1'],
      });
      expect(mocks.apiGet).toHaveBeenCalledTimes(1);
    });

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen={false}
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-2']}
          products={[{ id: 'product-2', name_en: 'Product 2', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('fresh failure');

    await act(async () => {
      staleRefresh.reject(new Error('stale refresh failed'));
      await Promise.resolve();
    });

    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith('stale refresh failed', {
      variant: 'error',
    });
  });
});
