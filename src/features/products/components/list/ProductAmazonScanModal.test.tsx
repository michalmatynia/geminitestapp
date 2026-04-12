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
  setValueMock: vi.fn(),
  getValuesMock: vi.fn(),
  addParameterValueMock: vi.fn(),
  updateParameterIdMock: vi.fn(),
  updateParameterValueMock: vi.fn(),
  setTextValueMock: vi.fn(),
  toggleSelectedOptionMock: vi.fn(),
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
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';

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
    mocks.getValuesMock.mockImplementation((field?: string) => {
      const values: Record<string, unknown> = {
        asin: '',
        ean: '',
        gtin: '',
        weight: 0,
        sizeLength: 0,
        sizeWidth: 0,
        length: 0,
      };
      return field ? values[field] : values;
    });
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

  it('shows and hides persisted scan steps for a modal scan row', async () => {
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
          steps: [
            {
              key: 'google_candidates',
              label: 'Collect Amazon candidates from Google Lens',
              status: 'completed',
              message: 'Found 3 Amazon candidates.',
              url: 'https://lens.google.com/search',
              startedAt: '2026-04-11T04:00:00.000Z',
              completedAt: '2026-04-11T04:00:01.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Extracted Amazon ASIN B000123456.',
              url: 'https://www.amazon.com/dp/B000123456',
              startedAt: '2026-04-11T04:00:02.000Z',
              completedAt: '2026-04-11T04:00:03.000Z',
            },
          ],
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show steps' }));

    expect(await screen.findByText('Collect Amazon candidates from Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Found 3 Amazon candidates.')).toBeInTheDocument();
    expect(screen.getByText('Extract Amazon details')).toBeInTheDocument();
    expect(screen.getByText('Extracted Amazon ASIN B000123456.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide steps' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Collect Amazon candidates from Google Lens')
      ).not.toBeInTheDocument();
    });
  });

  it('shows and hides diagnostics for a failed scan in the modal', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-diagnostics-1',
          runId: 'run-diagnostics-1',
          status: 'running',
          currentStatus: 'failed',
          message: 'Amazon scan already in progress.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-diagnostics-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'failed',
          productName: 'Product 1',
          engineRunId: 'run-diagnostics-1',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          steps: [
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              group: 'amazon',
              attempt: 1,
              candidateId: 'image-1',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'extract_failed',
              status: 'failed',
              message: 'Amazon detail extraction failed.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B000123456',
              startedAt: '2026-04-11T04:00:02.000Z',
              completedAt: '2026-04-11T04:00:04.000Z',
              durationMs: 2000,
            },
          ],
          rawResult: {
            runId: 'run-diagnostics-1',
            runStatus: 'failed',
            latestStage: 'amazon_extract',
            latestStageUrl: 'https://www.amazon.com/dp/B000123456',
            failureArtifacts: [
              {
                name: 'Amazon HTML',
                path: '/tmp/amazon-product.html',
                kind: 'html',
                mimeType: 'text/html',
              },
            ],
            logTail: ['opened amazon page', 'extract failed'],
          },
          error: 'Extract failed.',
          asinUpdateStatus: 'failed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:05.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:05.000Z',
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

    expect(await screen.findByText('Last failure')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('Extract Amazon details')).toBeInTheDocument();
    expect(screen.getByText('Amazon extraction')).toBeInTheDocument();
    expect(screen.getByText('Extract Failed')).toBeInTheDocument();
    expect(screen.getByText('Amazon detail extraction failed.')).toBeInTheDocument();
    expect(screen.getByText(/Duration 2\.0 s/)).toBeInTheDocument();
    expect(screen.getByText('1 artifact')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy artifact path' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open latest artifact' })).toHaveAttribute(
      'href',
      '/api/v2/products/scans/scan-diagnostics-1/artifacts/amazon-product.html'
    );
    expect(screen.getByRole('link', { name: 'Open stage URL' })).toHaveAttribute(
      'href',
      'https://www.amazon.com/dp/B000123456'
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Show diagnostics' }));

    expect(await screen.findByText('Run run-diagnostics-1')).toBeInTheDocument();
    expect(screen.getByText('Stage: Amazon Extract')).toBeInTheDocument();
    expect(screen.getByText('Amazon HTML')).toBeInTheDocument();
    expect(screen.getByText('/tmp/amazon-product.html')).toBeInTheDocument();
    expect(screen.getByText(/extract failed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide diagnostics' }));

    await waitFor(() => {
      expect(screen.queryByText('Run run-diagnostics-1')).not.toBeInTheDocument();
    });
  });

  it('falls back to raw diagnostics for the collapsed failure summary when no failed step is persisted', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-diagnostics-fallback-1',
          runId: 'run-diagnostics-fallback-1',
          status: 'running',
          currentStatus: 'failed',
          message: 'Amazon scan already in progress.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-diagnostics-fallback-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'failed',
          productName: 'Product 1',
          engineRunId: 'run-diagnostics-fallback-1',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          steps: [],
          rawResult: {
            runId: 'run-diagnostics-fallback-1',
            runStatus: 'failed',
            latestStage: 'google_candidates',
            latestStageUrl: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
            failureArtifacts: [],
            logTail: ['lens timeout', 'candidate collection failed'],
          },
          error: 'Amazon scan failed.',
          asinUpdateStatus: 'failed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T04:00:05.000Z',
          createdAt: '2026-04-11T03:59:00.000Z',
          updatedAt: '2026-04-11T04:00:05.000Z',
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

    expect(await screen.findByText('Last failure')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Google Candidates')).toBeInTheDocument();
    expect(screen.getByText('Candidate collection')).toBeInTheDocument();
    expect(screen.getAllByText('Failed')).toHaveLength(2);
    expect(screen.getByText('candidate collection failed')).toBeInTheDocument();
    expect(screen.getByText(/Updated /)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open stage URL' })).toHaveAttribute(
      'href',
      'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg'
    );
  });

  it('shows a collapsed rejected-candidate summary for completed scans', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-rejected-history-1',
          runId: 'run-rejected-history-1',
          status: 'running',
          currentStatus: 'completed',
          message: 'Amazon scan already completed.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-rejected-history-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-rejected-history-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            descriptionMatch: true,
            pageRepresentsSameProduct: true,
            confidence: 0.94,
            proceed: true,
            threshold: 0.85,
            reasons: ['The third candidate matches the product.'],
            mismatches: [],
            modelId: 'gpt-4o',
            brainApplied: null,
            evidence: {
              candidateUrl: 'https://www.amazon.com/dp/B000123456',
              pageTitle: 'Amazon title',
              heroImageSource: null,
              heroImageArtifactName: null,
              screenshotArtifactName: null,
              htmlArtifactName: null,
              productImageSource: '/uploads/product-1.jpg',
            },
            error: null,
            evaluatedAt: '2026-04-11T10:00:08.000Z',
          },
          steps: [
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              group: 'amazon',
              attempt: 1,
              candidateId: 'image-1',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_rejected',
              status: 'failed',
              message: 'AI evaluator rejected the Amazon candidate (21%).',
              warning: null,
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00WRONG123' },
                { label: 'Reason', value: 'The Amazon page shows a different product.' },
              ],
              url: 'https://www.amazon.com/dp/B00WRONG123',
              startedAt: '2026-04-11T10:00:01.000Z',
              completedAt: '2026-04-11T10:00:02.000Z',
              durationMs: 1000,
            },
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-1',
              candidateRank: 2,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_rejected',
              status: 'failed',
              message: 'AI evaluator rejected the Amazon candidate (17%).',
              warning: null,
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00WRONG456' },
                { label: 'Reason', value: 'The second Amazon page is still a different product.' },
              ],
              url: 'https://www.amazon.com/dp/B00WRONG456',
              startedAt: '2026-04-11T10:00:03.000Z',
              completedAt: '2026-04-11T10:00:04.000Z',
              durationMs: 1000,
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              group: 'amazon',
              attempt: 3,
              candidateId: 'image-1',
              candidateRank: 3,
              inputSource: null,
              retryOf: null,
              resultCode: 'match_found',
              status: 'completed',
              message: 'Extracted Amazon ASIN B000123456.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B000123456',
              startedAt: '2026-04-11T10:00:05.000Z',
              completedAt: '2026-04-11T10:00:07.000Z',
              durationMs: 2000,
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T10:00:08.000Z',
          createdAt: '2026-04-11T10:00:00.000Z',
          updatedAt: '2026-04-11T10:00:08.000Z',
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

    expect(await screen.findByText('AI candidate rejections')).toBeInTheDocument();
    expect(screen.getByText('2 candidates rejected before match')).toBeInTheDocument();
    expect(screen.getByText('The second Amazon page is still a different product.')).toBeInTheDocument();
    expect(screen.getByText('Latest rejected: https://www.amazon.com/dp/B00WRONG456')).toBeInTheDocument();
  });

  it('shows AI language rejection history in collapsed modal rows', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-language-rejected',
          runId: 'run-language-rejected',
          status: 'running',
          currentStatus: 'no_match',
          message: 'Amazon scan already completed.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-language-rejected',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'no_match',
          productName: 'Product 1',
          engineRunId: 'run-language-rejected',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          steps: [
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              group: 'amazon',
              attempt: 1,
              candidateId: 'image-1',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_language_rejected',
              status: 'failed',
              message: 'AI evaluator rejected the Amazon candidate because page content is not English.',
              warning: null,
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.de/dp/B00WRONG123' },
                { label: 'Language reason', value: 'Detected German product content.' },
                { label: 'Rejection kind', value: 'Language gate' },
              ],
              url: 'https://www.amazon.de/dp/B00WRONG123',
              startedAt: '2026-04-11T10:00:01.000Z',
              completedAt: '2026-04-11T10:00:02.000Z',
              durationMs: 1000,
            },
          ],
          rawResult: null,
          error: 'AI evaluator rejected the Amazon candidate because page content is not English.',
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: 'AI evaluator rejected the Amazon candidate because page content is not English.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T10:00:03.000Z',
          createdAt: '2026-04-11T10:00:00.000Z',
          updatedAt: '2026-04-11T10:00:03.000Z',
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

    expect(await screen.findByText('AI language rejections')).toBeInTheDocument();
    expect(screen.getByText('Detected German product content.')).toBeInTheDocument();
    expect(screen.getByText('1 non-English page rejected')).toBeInTheDocument();
    expect(screen.getByText('Latest rejected: https://www.amazon.de/dp/B00WRONG123')).toBeInTheDocument();
  });

  it('shows extracted fields in the modal and applies them when product form contexts are present', async () => {
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
          amazonDetails: {
            brand: null,
            manufacturer: 'Acme Manufacturing',
            modelNumber: null,
            partNumber: null,
            color: null,
            style: null,
            material: null,
            size: null,
            pattern: null,
            finish: null,
            itemDimensions: null,
            packageDimensions: null,
            itemWeight: null,
            packageWeight: null,
            bestSellersRank: null,
            ean: '5901234567890',
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            attributes: [],
            rankings: [],
          },
          steps: [],
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
        <ProductFormCoreStateContext.Provider
          value={
            {
              getValues: mocks.getValuesMock,
            } as never
          }
        >
          <ProductFormCoreActionsContext.Provider
            value={
              {
                setValue: mocks.setValueMock,
              } as never
            }
          >
            <ProductFormParameterContext.Provider
              value={
                {
                  parameters: [
                    {
                      id: 'param-manufacturer',
                      name_en: 'Manufacturer',
                      name_pl: null,
                      name_de: null,
                    },
                  ],
                  parametersLoading: false,
                  parameterValues: [],
                  addParameterValue: mocks.addParameterValueMock,
                  updateParameterId: mocks.updateParameterIdMock,
                  updateParameterValue: mocks.updateParameterValueMock,
                  updateParameterValueByLanguage: vi.fn(),
                  removeParameterValue: vi.fn(),
                } as never
              }
            >
              <ProductFormCustomFieldContext.Provider
                value={
                  {
                    customFields: [],
                    customFieldsLoading: false,
                    customFieldValues: [],
                    setTextValue: mocks.setTextValueMock,
                    toggleSelectedOption: mocks.toggleSelectedOptionMock,
                  } as never
                }
              >
                <ProductAmazonScanModal
                  isOpen
                  onClose={vi.fn()}
                  productIds={['product-1']}
                  products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
                />
              </ProductFormCustomFieldContext.Provider>
            </ProductFormParameterContext.Provider>
          </ProductFormCoreActionsContext.Provider>
        </ProductFormCoreStateContext.Provider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon result signal')).toBeInTheDocument();
    expect(screen.getByText('Strongest clean match')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    expect(await screen.findByRole('button', { name: 'Use EAN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Manufacturer mapping' })).toBeInTheDocument();
    expect(screen.getByText('Current: Not set')).toBeInTheDocument();
    expect(screen.getByText('Amazon: Acme Manufacturing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use EAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Manufacturer mapping' }));

    expect(mocks.setValueMock).toHaveBeenCalledWith('ean', '5901234567890', expect.any(Object));
    expect(mocks.addParameterValueMock).toHaveBeenCalled();
    expect(mocks.updateParameterIdMock).toHaveBeenCalledWith(0, 'param-manufacturer');
    expect(mocks.updateParameterValueMock).toHaveBeenCalledWith(0, 'Acme Manufacturing');
  });

  it('shows non-English rejection breakdown in collapsed recommendation signals', async () => {
    mocks.apiPost.mockResolvedValue({
      queued: 0,
      running: 0,
      alreadyRunning: 1,
      failed: 0,
      results: [
        {
          productId: 'product-1',
          scanId: 'scan-rec-language',
          runId: 'run-rec-language',
          status: 'running',
          currentStatus: 'completed',
          message: 'Amazon scan already completed.',
        },
      ],
    });

    mocks.apiGet.mockResolvedValue({
      scans: [
        {
          id: 'scan-rec-language',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-rec-language',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          amazonDetails: {
            brand: null,
            manufacturer: 'Acme Manufacturing',
            modelNumber: null,
            partNumber: null,
            color: null,
            style: null,
            material: null,
            size: null,
            pattern: null,
            finish: null,
            itemDimensions: null,
            packageDimensions: null,
            itemWeight: null,
            packageWeight: null,
            bestSellersRank: null,
            ean: '5901234567890',
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            attributes: [],
            rankings: [],
          },
          steps: [
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              group: 'amazon',
              attempt: 1,
              candidateId: 'image-1',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_rejected',
              status: 'failed',
              message: 'AI evaluator rejected the Amazon candidate (21%).',
              warning: null,
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00WRONG123' },
                { label: 'Reason', value: 'The Amazon page shows a different product.' },
              ],
              url: 'https://www.amazon.com/dp/B00WRONG123',
              startedAt: '2026-04-11T10:00:01.000Z',
              completedAt: '2026-04-11T10:00:02.000Z',
              durationMs: 1000,
            },
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-1',
              candidateRank: 2,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_language_rejected',
              status: 'failed',
              message: 'AI evaluator rejected the Amazon candidate because page content is not English (17%).',
              warning: null,
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.de/dp/B00WRONG456' },
                { label: 'Language reason', value: 'Detected German product content.' },
              ],
              url: 'https://www.amazon.de/dp/B00WRONG456',
              startedAt: '2026-04-11T10:00:03.000Z',
              completedAt: '2026-04-11T10:00:04.000Z',
              durationMs: 1000,
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              group: 'amazon',
              attempt: 3,
              candidateId: 'image-1',
              candidateRank: 3,
              inputSource: null,
              retryOf: null,
              resultCode: 'match_found',
              status: 'completed',
              message: 'Extracted Amazon ASIN B000123456.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B000123456',
              startedAt: '2026-04-11T10:00:05.000Z',
              completedAt: '2026-04-11T10:00:07.000Z',
              durationMs: 2000,
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T10:00:08.000Z',
          createdAt: '2026-04-11T10:00:00.000Z',
          updatedAt: '2026-04-11T10:00:08.000Z',
        },
      ],
    });

    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ProductFormCoreStateContext.Provider
          value={
            {
              getValues: mocks.getValuesMock,
            } as never
          }
        >
          <ProductFormCoreActionsContext.Provider
            value={
              {
                setValue: mocks.setValueMock,
              } as never
            }
          >
            <ProductFormParameterContext.Provider
              value={
                {
                  parameters: [
                    {
                      id: 'param-manufacturer',
                      name_en: 'Manufacturer',
                      name_pl: null,
                      name_de: null,
                    },
                  ],
                  parametersLoading: false,
                  parameterValues: [],
                  addParameterValue: mocks.addParameterValueMock,
                  updateParameterId: mocks.updateParameterIdMock,
                  updateParameterValue: mocks.updateParameterValueMock,
                  updateParameterValueByLanguage: vi.fn(),
                  removeParameterValue: vi.fn(),
                } as never
              }
            >
              <ProductFormCustomFieldContext.Provider
                value={
                  {
                    customFields: [],
                    customFieldsLoading: false,
                    customFieldValues: [],
                    setTextValue: mocks.setTextValueMock,
                    toggleSelectedOption: mocks.toggleSelectedOptionMock,
                  } as never
                }
              >
                <ProductAmazonScanModal
                  isOpen
                  onClose={vi.fn()}
                  productIds={['product-1']}
                  products={[{ id: 'product-1', name_en: 'Product 1', images: [] } as never]}
                />
              </ProductFormCustomFieldContext.Provider>
            </ProductFormParameterContext.Provider>
          </ProductFormCoreActionsContext.Provider>
        </ProductFormCoreStateContext.Provider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon result signal')).toBeInTheDocument();
    expect(screen.getByText('Strong match after 2 rejected candidates (1 non-English)')).toBeInTheDocument();
    expect(screen.getByText('Includes 1 non-English page rejected by the language gate.')).toBeInTheDocument();
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

  it('shows candidate continuation context when a scan advances after AI rejection', async () => {
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
          url: 'https://www.amazon.com/dp/B00TEST456',
          description: null,
          steps: [
            {
              key: 'queue_scan',
              label: 'Continue with next Amazon candidate',
              group: 'input',
              attempt: 2,
              candidateId: null,
              candidateRank: null,
              inputSource: null,
              retryOf: null,
              resultCode: 'run_queued',
              status: 'completed',
              message: 'Queued the next Amazon candidate after AI rejection.',
              warning: null,
              details: [
                { label: 'Rejected candidate URL', value: 'https://www.amazon.com/dp/B00TEST123' },
                { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
              ],
              url: 'https://www.amazon.com/dp/B00TEST456',
              startedAt: '2026-04-11T03:59:02.000Z',
              completedAt: '2026-04-11T03:59:03.000Z',
              durationMs: 1000,
            },
            {
              key: 'amazon_open',
              label: 'Open Amazon candidate',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: 2,
              inputSource: null,
              retryOf: null,
              resultCode: 'candidate_open_start',
              status: 'running',
              message: 'Opening Amazon candidate page.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B00TEST456',
              startedAt: '2026-04-11T03:59:04.000Z',
              completedAt: null,
              durationMs: null,
            },
          ],
          rawResult: {
            candidateContinuation: true,
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

    expect(await screen.findByText('Candidate continuation')).toBeInTheDocument();
    expect(screen.getByText('After AI rejection')).toBeInTheDocument();
    expect(screen.getByText('Continue with next Amazon candidate')).toBeInTheDocument();
    expect(screen.getByText('Queued the next Amazon candidate after AI rejection.')).toBeInTheDocument();
    expect(screen.getByText('Rejected: https://www.amazon.com/dp/B00TEST123')).toBeInTheDocument();
    expect(screen.getByText('Next: https://www.amazon.com/dp/B00TEST456')).toBeInTheDocument();
  });

  it('shows candidate continuation context when a scan advances after language rejection', async () => {
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
          url: 'https://www.amazon.com/dp/B00TEST456',
          description: null,
          steps: [
            {
              key: 'queue_scan',
              label: 'Continue with next Amazon candidate',
              group: 'input',
              attempt: 2,
              candidateId: null,
              candidateRank: null,
              inputSource: null,
              retryOf: null,
              resultCode: 'run_started',
              status: 'completed',
              message: 'Started the next Amazon candidate after language rejection.',
              warning: null,
              details: [
                { label: 'Rejection kind', value: 'Language gate' },
                { label: 'Rejected candidate URL', value: 'https://www.amazon.de/dp/B00TEST123' },
                { label: 'Next candidate URL', value: 'https://www.amazon.com/dp/B00TEST456' },
              ],
              url: 'https://www.amazon.com/dp/B00TEST456',
              startedAt: '2026-04-11T03:59:02.000Z',
              completedAt: '2026-04-11T03:59:03.000Z',
              durationMs: 1000,
            },
          ],
          rawResult: {
            candidateContinuation: true,
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

    expect(await screen.findByText('Candidate continuation')).toBeInTheDocument();
    expect(screen.getByText('After language rejection')).toBeInTheDocument();
    expect(screen.getAllByText('Started the next Amazon candidate after language rejection.').length).toBeGreaterThan(0);
  });

  it('shows the current phase and step for an active scan row without expanding steps', async () => {
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
          steps: [
            {
              key: 'prepare_scan',
              label: 'Prepare Amazon scan',
              group: 'input',
              attempt: 1,
              candidateId: null,
              candidateRank: null,
              inputSource: null,
              retryOf: null,
              resultCode: 'prepared',
              status: 'completed',
              message: 'Prepared 2 image candidates.',
              warning: null,
              details: [],
              url: null,
              startedAt: '2026-04-11T03:59:00.000Z',
              completedAt: '2026-04-11T03:59:01.000Z',
              durationMs: 1000,
            },
            {
              key: 'google_candidates',
              label: 'Collect Amazon candidates from Google results',
              group: 'google_lens',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: null,
              inputSource: 'url',
              retryOf: null,
              resultCode: 'collecting',
              status: 'running',
              message: 'Waiting for reverse image results.',
              warning: null,
              details: [],
              url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
              startedAt: '2026-04-11T03:59:02.000Z',
              completedAt: null,
              durationMs: null,
            },
          ],
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
    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Collect Amazon candidates from Google results')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('URL input')).toBeInTheDocument();
    expect(screen.getByText('Waiting for reverse image results.')).toBeInTheDocument();
    expect(screen.queryByText('Show steps')).toBeInTheDocument();
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
