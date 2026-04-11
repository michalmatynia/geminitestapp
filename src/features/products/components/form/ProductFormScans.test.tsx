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
  productAmazonScanModalMock: vi.fn(),
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

vi.mock('@/features/products/components/list/ProductAmazonScanModal', () => ({
  ProductAmazonScanModal: (props: {
    isOpen: boolean;
    productIds: string[];
    products: Array<{ id: string }>;
    onClose: () => void;
  }) => {
    mocks.productAmazonScanModalMock(props);
    return props.isOpen ? (
      <div data-testid='product-amazon-scan-modal'>{props.productIds.join(',')}</div>
    ) : null;
  },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props);
    }
    return <button {...props}>{children}</button>;
  },
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

  it('shows a captcha badge and guidance when manual verification is pending', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3b',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3b',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          rawResult: {
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Captcha')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.'
      )
    ).toBeInTheDocument();
  });

  it('shows a scanner settings shortcut that links to the global settings page', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    const link = await screen.findByRole('link', { name: 'Scanner settings' });
    expect(link).toHaveAttribute('href', '/admin/settings/scanner');
  });

  it('opens the Amazon scan modal for the current product from the Scans tab', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Scan Amazon' }));

    expect(await screen.findByTestId('product-amazon-scan-modal')).toHaveTextContent('product-1');
    expect(mocks.productAmazonScanModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        productIds: ['product-1'],
        products: [expect.objectContaining({ id: 'product-1' })],
      })
    );
  });

  it('shows and hides persisted scan steps for a scan entry', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-steps-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-steps-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          steps: [
            {
              key: 'google_upload',
              label: 'Upload image to Google Lens',
              status: 'completed',
              message: 'Uploaded image image-1 to Google Lens.',
              url: 'https://lens.google.com/search',
              startedAt: '2026-04-11T04:00:00.000Z',
              completedAt: '2026-04-11T04:00:02.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Extracted Amazon ASIN B000123456.',
              url: 'https://www.amazon.com/dp/B000123456',
              startedAt: '2026-04-11T04:00:03.000Z',
              completedAt: '2026-04-11T04:00:04.000Z',
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:05.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:05.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Show steps' }));

    expect(await screen.findByText('Upload image to Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Uploaded image image-1 to Google Lens.')).toBeInTheDocument();
    expect(screen.getByText('Extract Amazon details')).toBeInTheDocument();
    expect(screen.getByText('Extracted Amazon ASIN B000123456.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide steps' }));

    await waitFor(() => {
      expect(screen.queryByText('Upload image to Google Lens')).not.toBeInTheDocument();
    });
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
