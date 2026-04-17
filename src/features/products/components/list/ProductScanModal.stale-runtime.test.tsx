/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useDefault1688ConnectionMock: vi.fn(),
  testConnectionMutateAsync: vi.fn(),
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

vi.mock('@/shared/lib/query-invalidation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-invalidation')>();
  return {
    ...actual,
    invalidateProductsAndDetail: (...args: unknown[]) =>
      mocks.invalidateProductsAndDetail(...args),
    invalidateProductsAndCounts: (...args: unknown[]) =>
      mocks.invalidateProductsAndCounts(...args),
    invalidateProductScans: (...args: unknown[]) => mocks.invalidateProductScans(...args),
  };
});

vi.mock('@/shared/lib/timers', () => ({
  safeSetInterval: (...args: unknown[]) => {
    const callback = args[0];
    mocks.pollCallback = typeof callback === 'function' ? (callback as () => void) : null;
    return mocks.safeSetInterval(...args);
  },
  safeClearInterval: (...args: unknown[]) => mocks.safeClearInterval(...args),
}));

vi.mock('@/features/integrations/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => mocks.useIntegrationsWithConnectionsMock(),
  useDefault1688Connection: () => mocks.useDefault1688ConnectionMock(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useTestConnection: () => ({
    mutateAsync: (...args: unknown[]) => mocks.testConnectionMutateAsync(...args),
    error: null,
  }),
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

import { ProductScanModal } from './ProductScanModal';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('ProductScanModal stale runtime diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mocks.useDefault1688ConnectionMock.mockReturnValue({
      data: { connectionId: null },
      isLoading: false,
    });
    mocks.safeSetInterval.mockImplementation(() => 1);
    mocks.safeClearInterval.mockImplementation(() => undefined);
    mocks.pollCallback = null;
    mocks.testConnectionMutateAsync.mockResolvedValue({
      ok: true,
      sessionReady: true,
      message: '1688 session refreshed successfully.',
      steps: [],
    });
  });

  it('stops polling and shows persisted runtime diagnostics when a queued Amazon scan turns stale', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 1,
      running: 0,
      alreadyRunning: 0,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-stalled-1',
          runId: 'run-stalled-1',
          status: 'queued',
          message: 'Amazon reverse image scan queued.',
        },
      ],
    });
    mocks.apiGet
      .mockResolvedValueOnce({
        scans: [
          {
            id: 'scan-stalled-1',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'running',
            productName: 'Product 1',
            engineRunId: 'run-stalled-1',
            imageCandidates: [],
            matchedImageId: null,
            asin: null,
            title: null,
            price: null,
            url: null,
            description: null,
            steps: [],
            rawResult: {
              runId: 'run-stalled-1',
              runStatus: 'running',
              latestStage: 'google_upload',
              latestStageUrl: 'https://images.google.com/?hl=en',
              logTail: ['google lens upload pending'],
            },
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
      })
      .mockResolvedValueOnce({
        scans: [
          {
            id: 'scan-stalled-1',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'failed',
            productName: 'Product 1',
            engineRunId: 'run-stalled-1',
            imageCandidates: [],
            matchedImageId: null,
            asin: null,
            title: null,
            price: null,
            url: null,
            description: null,
            steps: [],
            rawResult: {
              runId: 'run-stalled-1',
              runStatus: 'running',
              latestStage: 'google_upload',
              latestStageUrl: 'https://images.google.com/?hl=en',
              logTail: ['google lens upload pending'],
              stalledReason: 'no_progress',
            },
            error: 'Amazon reverse image scan stalled at Google Upload.',
            asinUpdateStatus: 'failed',
            asinUpdateMessage: 'Amazon reverse image scan stalled at Google Upload.',
            createdBy: null,
            updatedBy: null,
            completedAt: '2026-04-11T04:03:00.000Z',
            createdAt: '2026-04-11T03:59:00.000Z',
            updatedAt: '2026-04-11T04:03:00.000Z',
          },
        ],
      });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductScanModal
          isOpen
          onClose={vi.fn()}
          productIds={['product-1']}
          products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/v2/products/scans/amazon/batch', {
        productIds: ['product-1'],
        selectorProfile: 'amazon',
      });
      expect(mocks.safeSetInterval).toHaveBeenCalled();
      expect(mocks.pollCallback).not.toBeNull();
    });

    expect((await screen.findAllByText('Running')).length).toBeGreaterThan(0);

    await act(async () => {
      mocks.pollCallback?.();
      await Promise.resolve();
    });

    expect(
      await screen.findByText('Amazon reverse image scan stalled at Google Upload.')
    ).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Google Upload')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open stage URL' })).toHaveAttribute(
      'href',
      'https://images.google.com/?hl=en'
    );

    await waitFor(() => {
      expect(mocks.safeClearInterval).toHaveBeenCalled();
    });
  });
});
