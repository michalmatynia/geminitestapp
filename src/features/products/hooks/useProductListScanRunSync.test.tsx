import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductScanListResponse, ProductScanRecord, ProductScanStep } from '@/shared/contracts/product-scans';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import { useProductListScanRunSync } from './useProductListScanRunSync';

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

const createScanRecord = (overrides: Partial<ProductScanRecord> = {}): ProductScanRecord => ({
  id: 'scan-1',
  productId: 'product-1',
  integrationId: null,
  connectionId: null,
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
  amazonDetails: null,
  amazonProbe: null,
  amazonEvaluation: null,
  supplierDetails: null,
  supplierProbe: null,
  supplierEvaluation: null,
  steps: [],
  rawResult: null,
  error: null,
  asinUpdateStatus: 'pending',
  asinUpdateMessage: null,
  createdBy: null,
  updatedBy: null,
  completedAt: null,
  createdAt: '2026-04-24T08:00:00.000Z',
  updatedAt: '2026-04-24T08:01:00.000Z',
  ...overrides,
});

const createResponse = (scan: ProductScanRecord): ProductScanListResponse => ({
  scans: [scan],
});

const manualFallbackStep: ProductScanStep = {
  key: 'google_manual_retry',
  label: 'Open Google candidate search in visible browser',
  group: 'google_lens',
  status: 'completed',
  message: 'Opened a visible browser for Google captcha verification.',
  details: [],
  url: 'https://www.google.com/sorry/index',
  attempt: null,
  candidateId: null,
  candidateRank: null,
  inputSource: null,
  retryOf: null,
  resultCode: 'run_started',
  warning: null,
  startedAt: null,
  completedAt: null,
  durationMs: null,
};

describe('useProductListScanRunSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the visible label when a running scan enters Google stealth retry without a timestamp change', async () => {
    const queryClient = createQueryClient();
    let response = createResponse(createScanRecord());
    apiGetMock.mockImplementation(async () => response);

    const view = renderHook(
      () =>
        useProductListScanRunSync({
          productIds: ['product-1'],
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(view.result.current.get('product-1')?.label).toBe('Running');
    });

    response = createResponse(
      createScanRecord({
        rawResult: {
          captchaStealthRetryStarted: true,
        },
      })
    );

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.scansLatest(['product-1']),
      });
    });

    await waitFor(() => {
      expect(view.result.current.get('product-1')).toMatchObject({
        label: 'Retrying Google',
        variant: 'warning',
      });
    });
  });

  it('refreshes the visible label when a running scan opens the manual Google fallback without a timestamp change', async () => {
    const queryClient = createQueryClient();
    let response = createResponse(createScanRecord());
    apiGetMock.mockImplementation(async () => response);

    const view = renderHook(
      () =>
        useProductListScanRunSync({
          productIds: ['product-1'],
        }),
      {
        wrapper: createWrapper(queryClient),
      }
    );

    await waitFor(() => {
      expect(view.result.current.get('product-1')?.label).toBe('Running');
    });

    response = createResponse(
      createScanRecord({
        rawResult: {
          manualVerificationPending: true,
          captchaManualRetryStarted: true,
        },
        steps: [manualFallbackStep],
      })
    );

    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.scansLatest(['product-1']),
      });
    });

    await waitFor(() => {
      expect(view.result.current.get('product-1')).toMatchObject({
        label: 'Manual Fallback',
        variant: 'warning',
      });
    });
  });
});
