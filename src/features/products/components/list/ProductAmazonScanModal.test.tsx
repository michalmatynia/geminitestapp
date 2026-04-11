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

  it('shows the manual verification guidance when a running scan is waiting on captcha resolution', async () => {
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
          rawResult: {
            status: 'captcha_required',
            manualVerificationPending: true,
          },
          error: null,
          asinUpdateStatus: 'pending',
          asinUpdateMessage:
            'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
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

    await screen.findByText(
      'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.'
    );
    expect(screen.getByText('Captcha')).toBeInTheDocument();
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

  it('fails an active batch result immediately when it has no scan id to refresh', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 1,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: null,
          runId: 'run-1',
          status: 'running',
          message: 'Amazon reverse image scan running.',
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

    expect(
      await screen.findByText('Amazon scan request returned an active scan without a trackable scan id.')
    ).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(mocks.safeSetInterval).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Amazon scans: 1 failed.', {
      variant: 'warning',
    });
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

  it('shows a queued state immediately when the batch response reports an already-running queued scan', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: 'run-1',
          status: 'already_running',
          currentStatus: 'queued',
          message: 'Amazon scan already in progress for this product.',
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
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await screen.findByText('Queued');
    expect(screen.queryByText('Running')).not.toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith('Amazon scans: 1 already in progress.', {
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

  it('invalidates selected product views when enqueueing the batch request fails', async () => {
    mocks.apiPost.mockRejectedValue(new Error('batch request failed'));

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

    expect(await screen.findByText('batch request failed')).toBeInTheDocument();
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
      expect(mocks.toast).toHaveBeenCalledWith('batch request failed', {
        variant: 'error',
      });
    });
  });

  it('automatically rediscovers a latest scan by product id after an enqueue failure', async () => {
    mocks.apiPost.mockRejectedValue(new Error('batch request failed'));
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

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
      expect(mocks.safeSetInterval).toHaveBeenCalled();
    });

    expect(mocks.toast).not.toHaveBeenCalledWith('batch request failed', {
      variant: 'error',
    });
  });

  it('invalidates product views when enqueue recovery discovers a new completed scan', async () => {
    const recoveredTimestamp = new Date().toISOString();

    mocks.apiPost.mockRejectedValue(new Error('batch request failed'));
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
          title: 'Recovered Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: recoveredTimestamp,
          createdAt: recoveredTimestamp,
          updatedAt: recoveredTimestamp,
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
      expect(screen.getByText('Recovered Amazon title')).toBeInTheDocument();
      expect(screen.getByText('Product ASIN filled from Amazon scan.')).toBeInTheDocument();
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

  it('does not replace an enqueue failure with an older historical terminal scan', async () => {
    mocks.apiPost.mockRejectedValue(new Error('batch request failed'));
    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-old',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-old',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Older Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2000-01-01T04:00:00.000Z',
          createdAt: '2000-01-01T03:59:00.000Z',
          updatedAt: '2000-01-01T04:00:00.000Z',
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
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('batch request failed')).toBeInTheDocument();
      expect(screen.queryByText('Older Amazon title')).not.toBeInTheDocument();
      expect(mocks.safeSetInterval).not.toHaveBeenCalled();
    });
  });

  it('rediscovers a latest scan by product id after an enqueue failure and resumes polling', async () => {
    mocks.apiPost.mockRejectedValue(new Error('batch request failed'));
    mocks.apiGet
      .mockResolvedValueOnce({ scans: [] })
      .mockResolvedValueOnce({
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

    expect(await screen.findByText('batch request failed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
      expect(mocks.safeSetInterval).toHaveBeenCalled();
    });
  });

  it('invalidates product views for failed scan records returned directly by the batch response', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: null,
          status: 'failed',
          message: 'No product image available for Amazon reverse image scan.',
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

    await screen.findByText('No product image available for Amazon reverse image scan.');

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

  it('keeps the batch result visible when follow-up invalidation fails', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 1,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-1',
          runId: null,
          status: 'failed',
          message: 'No product image available for Amazon reverse image scan.',
        },
      ],
    });
    mocks.invalidateProductsAndDetail.mockRejectedValueOnce(new Error('invalidate failed'));

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

    expect(
      await screen.findByText('No product image available for Amazon reverse image scan.')
    ).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith('invalidate failed', {
      variant: 'error',
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

  it('automatically rediscovers an omitted product scan when the batch response returns no tracked rows', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [],
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

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
      expect(mocks.safeSetInterval).toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith('Amazon scans: 1 running.', {
        variant: 'success',
      });
    });
  });

  it('refreshes tracked and untracked rows together when a batch response omits one product', async () => {
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
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/scans') {
        return {
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
        };
      }

      if (url === '/api/v2/products/product-2/scans') {
        return {
          scans: [
            {
              id: 'scan-2',
              productId: 'product-2',
              provider: 'amazon',
              scanType: 'google_reverse_image',
              status: 'running',
              productName: 'Product 2',
              engineRunId: 'run-2',
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
        };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
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

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/scans', {
        cache: 'no-store',
        params: { ids: 'scan-1', limit: 1 },
      });
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-2/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getAllByText('Running').length).toBeGreaterThan(0);
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
      expect(mocks.safeSetInterval).toHaveBeenCalled();
    });
  });

  it('continues refreshing via product rediscovery when tracked scan lookup fails', async () => {
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
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/scans') {
        throw new Error('tracked lookup failed');
      }

      if (url === '/api/v2/products/product-1/scans') {
        return {
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
        };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
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
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/scans', {
        cache: 'no-store',
        params: { ids: 'scan-1', limit: 1 },
      });
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
    });

    expect(mocks.toast).not.toHaveBeenCalledWith('tracked lookup failed', {
      variant: 'error',
    });
    expect(mocks.safeClearInterval).not.toHaveBeenCalled();
  });

  it('rediscovers a current scan by product id when the tracked scan id disappears during refresh', async () => {
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
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/scans') {
        return { scans: [] };
      }

      if (url === '/api/v2/products/product-1/scans') {
        return {
          scans: [
            {
              id: 'scan-2',
              productId: 'product-1',
              provider: 'amazon',
              scanType: 'google_reverse_image',
              status: 'running',
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
        };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
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
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Amazon reverse image scan running.')).toBeInTheDocument();
    });
  });

  it('marks a queued scan as failed when its record disappears during refresh and no replacement scan is found', async () => {
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
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/scans') {
        return { scans: [] };
      }

      if (url === '/api/v2/products/product-1/scans') {
        return { scans: [] };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
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

    await screen.findByText('Amazon scan record could not be refreshed.');
    expect(screen.queryByText('Amazon reverse image scan queued.')).not.toBeInTheDocument();
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
      cache: 'no-store',
      params: { limit: 1 },
    });
    expect(mocks.safeClearInterval).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
      });
    });
  });

  it('does not keep a stale active row when tracked scan lookup only finds an older historical scan', async () => {
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
    mocks.apiGet.mockImplementation(async (url: string) => {
      if (url === '/api/v2/products/scans') {
        return { scans: [] };
      }

      if (url === '/api/v2/products/product-1/scans') {
        return {
          scans: [
            {
              id: 'scan-old',
              productId: 'product-1',
              provider: 'amazon',
              scanType: 'google_reverse_image',
              status: 'completed',
              productName: 'Product 1',
              engineRunId: 'run-old',
              imageCandidates: [],
              matchedImageId: 'image-1',
              asin: 'B000123456',
              title: 'Older Amazon title',
              price: '$10.99',
              url: 'https://www.amazon.com/dp/B000123456',
              description: 'Amazon description',
              rawResult: null,
              error: null,
              asinUpdateStatus: 'updated',
              asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
              createdBy: null,
              updatedBy: null,
              completedAt: '2000-01-01T04:00:00.000Z',
              createdAt: '2000-01-01T03:59:00.000Z',
              updatedAt: '2000-01-01T04:00:00.000Z',
            },
          ],
        };
      }

      throw new Error(`Unexpected api.get request: ${url}`);
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

    await screen.findByText('Amazon scan record could not be refreshed.');
    expect(screen.queryByText('Older Amazon title')).not.toBeInTheDocument();
    expect(screen.queryByText('Amazon reverse image scan queued.')).not.toBeInTheDocument();
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

  it('does not enqueue again when the logical product selection is unchanged across rerenders', async () => {
    mocks.apiPost.mockResolvedValue({
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
          message: 'enqueue failed',
        },
      ],
    });

    const queryClient = createQueryClient();

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={[' product-1 ', 'product-1']}
          products={[{ id: 'product-1', name_en: 'Original Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledTimes(1);
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v2/products/scans/amazon/batch', {
        productIds: ['product-1'],
      });
    });

    await screen.findByText('Original Product 1');

    rerender(
      <QueryClientProvider client={queryClient}>
        <ProductAmazonScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Renamed Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Renamed Product 1')).toBeInTheDocument();
    expect(screen.queryByText('Original Product 1')).not.toBeInTheDocument();
    expect(screen.getByText('enqueue failed')).toBeInTheDocument();
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

  it('ignores stale enqueue failure recovery completions from a previous modal session', async () => {
    const staleRecovery = createDeferred<{ scans: Array<Record<string, unknown>> }>();

    mocks.apiPost
      .mockRejectedValueOnce(new Error('stale batch request failed'))
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
    mocks.apiGet.mockImplementationOnce(async () => await staleRecovery.promise);

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
      expect(screen.getByText('stale batch request failed')).toBeInTheDocument();
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 1 },
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

    await screen.findByText('fresh failure');

    await act(async () => {
      staleRecovery.resolve({
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
      await Promise.resolve();
    });

    expect(screen.getByText('Product 2')).toBeInTheDocument();
    expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith('stale batch request failed', {
      variant: 'error',
    });
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
