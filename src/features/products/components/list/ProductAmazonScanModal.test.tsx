/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  toast: vi.fn(),
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
      <div>
        <div>{title}</div>
        <div>{subtitle}</div>
        <div>{headerActions}</div>
        <div>{children}</div>
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

describe('ProductAmazonScanModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('replaces the queued message with the completed ASIN update message and invalidates scans', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
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
});
