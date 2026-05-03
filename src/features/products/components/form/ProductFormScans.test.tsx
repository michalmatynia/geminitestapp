/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';

const mocks = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useProductFormParametersMock: vi.fn(),
  useProductFormCustomFieldsMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiDeleteMock: vi.fn(),
  invalidateProductsMock: vi.fn().mockResolvedValue(undefined),
  productScanModalMock: vi.fn(),
  setValueMock: vi.fn(),
  getValuesMock: vi.fn(),
  addParameterValueMock: vi.fn(),
  updateParameterIdMock: vi.fn(),
  updateParameterValueMock: vi.fn(),
  setTextValueMock: vi.fn(),
  toggleSelectedOptionMock: vi.fn(),
  setImageLinkAtMock: vi.fn(),
  setImageBase64AtMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => mocks.useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormParameterContext', () => ({
  useProductFormParameters: () => mocks.useProductFormParametersMock(),
}));

vi.mock('@/features/products/context/ProductFormCustomFieldContext', () => ({
  useProductFormCustomFields: () => mocks.useProductFormCustomFieldsMock(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: (...args: unknown[]) => mocks.apiGetMock(...args),
    post: (...args: unknown[]) => mocks.apiPostMock(...args),
    delete: (...args: unknown[]) => mocks.apiDeleteMock(...args),
  },
}));

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => mocks.useIntegrationsWithConnectionsMock(),
}));

vi.mock('@/features/products/components/list/ProductScanModal', () => ({
  ProductScanModal: (props: {
    isOpen: boolean;
    productIds: string[];
    products: Array<{ id: string }>;
    onClose: () => void;
    provider?: 'amazon' | '1688';
  }) => {
    mocks.productScanModalMock(props);
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

describe('ProductFormScans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getValuesMock.mockImplementation((field?: string) => {
      const values: Record<string, unknown> = {
        asin: '',
        ean: '',
        gtin: '',
        weight: 0,
        sizeLength: 0,
        sizeWidth: 0,
        length: 0,
        supplierName: '',
        supplierLink: '',
        priceComment: '',
      };
      return field ? values[field] : values;
    });
    mocks.useProductFormCoreMock.mockReturnValue({
      product: { id: 'product-1' },
      setValue: mocks.setValueMock,
      getValues: mocks.getValuesMock,
    });
    mocks.useProductFormParametersMock.mockReturnValue({
      parameters: [],
      parametersLoading: false,
      parameterValues: [],
      addParameterValue: mocks.addParameterValueMock,
      updateParameterId: mocks.updateParameterIdMock,
      updateParameterValue: mocks.updateParameterValueMock,
      updateParameterValueByLanguage: vi.fn(),
      removeParameterValue: vi.fn(),
    });
    mocks.useProductFormCustomFieldsMock.mockReturnValue({
      customFields: [],
      customFieldsLoading: false,
      customFieldValues: [],
      setTextValue: mocks.setTextValueMock,
      toggleSelectedOption: mocks.toggleSelectedOptionMock,
    });
    mocks.useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [],
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
        <ProductFormImageContext.Provider
          value={
            {
              imageSlots: [],
              imageLinks: ['', '', '', '', '', '', '', ''],
              imageBase64s: ['', '', '', '', '', '', '', ''],
              productId: 'product-1',
              uploading: false,
              uploadError: null,
              uploadSuccess: false,
              showFileManager: false,
              setShowFileManager: vi.fn(),
              handleSlotImageChange: vi.fn(),
              handleSlotFileSelect: vi.fn(),
              handleSlotDisconnectImage: vi.fn(),
              handleMultiImageChange: vi.fn(),
              handleMultiFileSelect: vi.fn(),
              swapImageSlots: vi.fn(),
              setImageLinkAt: mocks.setImageLinkAtMock,
              setImageBase64At: mocks.setImageBase64AtMock,
              setImagesReordering: vi.fn(),
              refreshImagesFromProduct: vi.fn(),
            } as never
          }
        >
          <ProductFormScans />
        </ProductFormImageContext.Provider>
      </QueryClientProvider>
    );

    expect((await screen.findAllByText('Product ASIN filled from Amazon scan.'))[0]).toBeInTheDocument();
    expect(screen.getByText('Amazon title')).toBeInTheDocument();
    expect(screen.getByText('ASIN B000123456 · Price $10.99')).toBeInTheDocument();
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
          error: 'Amazon candidate search did not return a usable Amazon result.',
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: 'Amazon candidate search did not return a usable Amazon result.',
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
      await screen.findByText('Amazon candidate search did not return a usable Amazon result.')
    ).toBeInTheDocument();
  });

  it('shows awaiting-selection messaging for candidate-selection scans', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-selection-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-selection-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: null,
          price: null,
          url: 'https://www.amazon.co.jp/dp/B0TEST1234',
          description: null,
          rawResult: {
            candidateSelectionRequired: true,
          },
          error: null,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: 'Collected Amazon candidate previews for manual selection.',
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

    expect(await screen.findByText('Awaiting Selection')).toBeInTheDocument();
    expect(
      screen.getByText('Amazon candidates are ready for manual selection.')
    ).toBeInTheDocument();
  });

  it('queues candidate extraction directly from scan history', async () => {
    let getCalls = 0;
    mocks.apiGetMock.mockImplementation(async () => {
      getCalls += 1;

      if (getCalls === 1) {
        return {
          scans: [
            {
              id: 'scan-selection-2',
              productId: 'product-1',
              provider: 'amazon',
              scanType: 'google_reverse_image',
              status: 'completed',
              productName: 'Product 1',
              engineRunId: 'run-selection-2',
              imageCandidates: [],
              matchedImageId: 'image-1',
              asin: null,
              title: null,
              price: null,
              url: null,
              description: null,
              rawResult: {
                candidateSelectionRequired: true,
                candidatePreviews: [
                  {
                    id: 'candidate-1',
                    matchedImageId: 'image-1',
                    url: 'https://www.amazon.com/dp/B000123456',
                    title: 'Amazon candidate title',
                    asin: 'B000123456',
                    marketplaceDomain: 'www.amazon.com',
                    rank: 1,
                  },
                ],
              },
              error: null,
              asinUpdateStatus: 'not_needed',
              asinUpdateMessage: 'Collected Amazon candidate previews for manual selection.',
              createdBy: null,
              updatedBy: null,
              completedAt: '2026-04-11T04:00:00.000Z',
              createdAt: '2026-04-11T03:59:00.000Z',
              updatedAt: '2026-04-11T04:00:00.000Z',
            },
          ],
        };
      }

      return {
        scans: [
          {
            id: 'scan-extract-2',
            productId: 'product-1',
            provider: 'amazon',
            scanType: 'google_reverse_image',
            status: 'queued',
            productName: 'Product 1',
            engineRunId: 'run-extract-2',
            imageCandidates: [],
            matchedImageId: null,
            asin: null,
            title: null,
            price: null,
            url: null,
            description: null,
            rawResult: {
              runtimeKey: 'amazon_candidate_extraction',
            },
            error: null,
            asinUpdateStatus: 'pending',
            asinUpdateMessage: null,
            createdBy: null,
            updatedBy: null,
            completedAt: null,
            createdAt: '2026-04-11T04:00:01.000Z',
            updatedAt: '2026-04-11T04:00:01.000Z',
          },
        ],
      };
    });
    mocks.apiPostMock.mockResolvedValue({
      productId: 'product-1',
      scanId: 'scan-extract-2',
      runId: 'run-extract-2',
      status: 'queued',
      currentStatus: 'queued',
      message: 'Amazon candidate extraction queued.',
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Candidates for extraction')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Extract this candidate' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith(
        '/api/v2/products/scans/amazon/extract-candidate',
        {
          productId: 'product-1',
          scanId: 'scan-selection-2',
          candidateUrl: 'https://www.amazon.com/dp/B000123456',
          candidateRank: 1,
          candidateId: 'image-1',
        }
      );
    });

    expect(await screen.findByText('Queued')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Candidates for extraction')).not.toBeInTheDocument();
    });
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon candidate search running.')).toBeInTheDocument();
    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Collect Amazon candidates from Google results')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('URL input')).toBeInTheDocument();
    expect(screen.getByText('Waiting for reverse image results.')).toBeInTheDocument();
  });

  it('shows candidate continuation context when the scan moves past an AI-rejected Amazon page', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3c',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3c',
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Candidate continuation')).toBeInTheDocument();
    expect(screen.getByText('After AI rejection')).toBeInTheDocument();
    expect(screen.getByText('Continue with next Amazon candidate')).toBeInTheDocument();
    expect(screen.getByText('Queued the next Amazon candidate after AI rejection.')).toBeInTheDocument();
  });

  it('shows candidate continuation context when the scan moves past a language-rejected Amazon page', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3d',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3d',
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Candidate continuation')).toBeInTheDocument();
    expect(screen.getByText('After language rejection')).toBeInTheDocument();
    expect(screen.getAllByText('Started the next Amazon candidate after language rejection.').length).toBeGreaterThan(0);
  });

  it('shows automatic Google retry context after a captcha-blocked scan queues a stealth retry', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3f',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3f',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          steps: [
            {
              key: 'google_stealth_retry',
              label: 'Retry Google candidate search with fresh proxy session',
              group: 'google_lens',
              attempt: 1,
              candidateId: null,
              candidateRank: null,
              inputSource: 'url',
              retryOf: 'run-3f-prev',
              resultCode: 'run_started',
              status: 'completed',
              message:
                'Queued an automatic Google retry with a fresh proxy session before manual fallback.',
              warning: null,
              details: [
                { label: 'Blocked URL', value: 'https://www.google.com/sorry/index' },
              ],
              url: 'https://www.google.com/sorry/index',
              startedAt: '2026-04-11T03:59:04.000Z',
              completedAt: '2026-04-11T03:59:05.000Z',
              durationMs: 1000,
            },
          ],
          rawResult: {
            captchaStealthRetryStarted: true,
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Automatic retry')).toBeInTheDocument();
    expect(screen.getByText('After captcha block')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Queued an automatic Google retry with a fresh proxy session before manual fallback.'
      )
    ).toBeInTheDocument();
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
          steps: [
            {
              key: 'google_manual_retry',
              label: 'Open Google candidate search in visible browser',
              group: 'google_lens',
              attempt: 1,
              candidateId: null,
              candidateRank: null,
              inputSource: 'url',
              retryOf: 'run-3b-prev',
              resultCode: 'run_started',
              status: 'completed',
              message: 'Opened a visible browser for Google captcha verification.',
              warning: null,
              details: [
                { label: 'Recovery path', value: 'After captcha block' },
                { label: 'Opened URL', value: 'https://www.google.com/sorry/index' },
              ],
              url: 'https://www.google.com/sorry/index',
              startedAt: '2026-04-11T03:59:00.000Z',
              completedAt: '2026-04-11T03:59:01.000Z',
              durationMs: 1000,
            },
          ],
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

    expect(await screen.findByText('Manual Fallback')).toBeInTheDocument();
    expect(screen.getByText('Manual fallback')).toBeInTheDocument();
    expect(screen.getByText('After captcha block')).toBeInTheDocument();
    expect(
      screen.getByText('Opened a visible browser for Google captcha verification.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.'
      )
    ).toBeInTheDocument();
  });

  it('shows the automatic Google retry state before manual captcha fallback', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-3c',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-3c',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          rawResult: {
            captchaStealthRetryStarted: true,
            manualVerificationPending: false,
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Retrying Google')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Retrying Google Lens automatically with a fresh proxy session before manual fallback.'
      )
    ).toBeInTheDocument();
  });

  it('shows the same captcha badge for 1688 scans waiting on manual verification', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1688-captcha',
          productId: 'product-1',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'running',
          productName: 'Product 1',
          engineRunId: 'run-1688-captcha',
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
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage:
            '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.',
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
        '1688 requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.'
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

    const link = await screen.findByTitle('Scanner Settings');
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
    expect(mocks.productScanModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        productIds: ['product-1'],
        products: [expect.objectContaining({ id: 'product-1' })],
        provider: 'amazon',
      })
    );
  });

  it('opens the 1688 scan modal for the current product from the Scans tab', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Scan 1688' }));

    expect(await screen.findByTestId('product-amazon-scan-modal')).toHaveTextContent('product-1');
    expect(mocks.productScanModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        productIds: ['product-1'],
        products: [expect.objectContaining({ id: 'product-1' })],
        provider: '1688',
      })
    );
  });

  it('shows the resolved 1688 browser profile on scan history rows', async () => {
    mocks.useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'integration-1688',
          name: '1688',
          slug: '1688',
          connections: [
            {
              id: 'connection-1688-main',
              name: 'Main 1688 Browser',
              integrationId: 'integration-1688',
            },
          ],
        },
      ],
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1688-history-1',
          productId: 'product-1',
          integrationId: 'integration-1688',
          connectionId: 'connection-1688-main',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-1688-1',
          imageCandidates: [],
          matchedImageId: null,
          asin: null,
          title: 'Yiwu supplier result',
          price: null,
          url: 'https://detail.1688.com/offer/123456789.html',
          description: 'Supplier description',
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: null,
          supplierDetails: {
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
            platformProductId: '123456789',
            currency: 'CNY',
            priceText: '¥12.80',
            priceRangeText: null,
            moqText: null,
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/123456789.html',
            canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
            pageTitle: 'Yiwu Supplier Listing',
            descriptionSnippet: null,
            pageLanguage: 'zh-CN',
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            priceText: '¥12.80',
            currency: 'CNY',
            heroImageUrl: null,
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: 'probe-artifact',
            imageCount: 1,
          },
          supplierEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            titleMatch: true,
            confidence: 0.91,
            proceed: true,
            reasons: ['Same supplier product'],
            mismatches: [],
            modelId: 'gpt-5.4-mini',
            error: null,
            evaluatedAt: '2026-04-12T06:40:00.000Z',
          },
          steps: [],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-12T06:40:00.000Z',
          createdAt: '2026-04-12T06:35:00.000Z',
          updatedAt: '2026-04-12T06:40:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findAllByText(/Main 1688 Browser/)).not.toHaveLength(0);
    expect(screen.getByText('Browser profile')).toBeInTheDocument();
  });

  it('renders stored 1688 supplier details inside scan history', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1688-1',
          productId: 'product-1',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'completed',
          productName: 'Supplier Product 1',
          engineRunId: 'run-1688-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: '1688 supplier listing',
          price: '¥12.80-14.20',
          url: 'https://detail.1688.com/offer/123456789.html',
          description: 'Supplier listing for the scanned product.',
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: null,
          supplierDetails: {
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
            platformProductId: '123456789',
            currency: 'CNY',
            priceText: '¥12.80-14.20',
            priceRangeText: '¥12.80-14.20',
            moqText: 'MOQ 20 pcs',
            supplierLocation: 'Zhejiang, China',
            supplierRating: 'Gold supplier',
            sourceLanguage: 'zh-CN',
            images: [
              {
                url: 'https://cbu01.alicdn.com/image1.jpg',
                alt: null,
                artifactName: null,
                source: 'hero',
              },
            ],
            prices: [
              {
                label: 'Range',
                amount: '12.80',
                currency: 'CNY',
                rangeStart: '12.80',
                rangeEnd: '14.20',
                moq: '20',
                unit: 'pcs',
                source: 'page',
              },
            ],
          },
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/123456789.html',
            canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
            pageTitle: 'Yiwu Supplier Listing',
            descriptionSnippet: 'Supplier listing for the scanned product.',
            pageLanguage: 'zh-CN',
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            priceText: '¥12.80-14.20',
            currency: 'CNY',
            heroImageUrl: 'https://cbu01.alicdn.com/image1.jpg',
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: '1688-scan-probe-image-1',
            imageCount: 1,
          },
          supplierEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            titleMatch: true,
            confidence: 0.91,
            proceed: true,
            reasons: ['Supplier gallery and title align with the source product.'],
            mismatches: [],
            modelId: 'gpt-5.4-mini',
            error: null,
            evaluatedAt: '2026-04-12T06:40:00.000Z',
          },
          steps: [],
          rawResult: {
            candidateUrls: [
              'https://detail.1688.com/offer/123456789.html',
              'https://detail.1688.com/offer/987654321.html',
            ],
          },
          error: null,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-12T06:40:10.000Z',
          createdAt: '2026-04-12T06:39:00.000Z',
          updatedAt: '2026-04-12T06:40:10.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect((await screen.findAllByText('1688 supplier details')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Preferred 1688 supplier result').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI-approved supplier match').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Yiwu Supplier Co.').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rank 1 of 1')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Preferred over other 1688 supplier results for this product.')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Compare with')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Use Product Link' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Use Store Link' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('https://detail.1688.com/offer/987654321.html').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Extracted prices').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Match evaluation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Apply to product form').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use Supplier Name' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use Product Link' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use Price Summary' })[0]);
    expect(mocks.setValueMock).toHaveBeenCalledWith(
      'supplierName',
      'Yiwu Supplier Co.',
      expect.any(Object)
    );
    expect(mocks.setValueMock).toHaveBeenCalledWith(
      'supplierLink',
      'https://detail.1688.com/offer/123456789.html',
      expect.any(Object)
    );
    expect(mocks.setValueMock).toHaveBeenCalledWith(
      'priceComment',
      '¥12.80-14.20 · MOQ 20 pcs',
      expect.any(Object)
    );
  });

  it('shows AI Rejected for 1688 no-match scans rejected by the supplier evaluator', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1688-rejected-1',
          productId: 'product-1',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'no_match',
          productName: 'Supplier Product 1',
          engineRunId: 'run-1688-rejected-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: null,
          price: null,
          url: null,
          description: null,
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: null,
          supplierDetails: null,
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/123456789.html',
            canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
            pageTitle: 'Yiwu Supplier Listing',
            descriptionSnippet: null,
            pageLanguage: 'zh-CN',
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: null,
            priceText: null,
            currency: null,
            heroImageUrl: null,
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: '1688-scan-probe-image-1',
            imageCount: 1,
          },
          supplierEvaluation: {
            status: 'rejected',
            sameProduct: false,
            imageMatch: false,
            titleMatch: false,
            confidence: 0.41,
            proceed: false,
            reasons: ['Supplier candidate does not match the source product.'],
            mismatches: ['Supplier gallery differs from the source product.'],
            modelId: 'gpt-4.1-mini',
            error: null,
            evaluatedAt: '2026-04-12T06:40:00.000Z',
          },
          steps: [],
          rawResult: {
            candidateUrls: [
              'https://detail.1688.com/offer/123456789.html',
              'https://detail.1688.com/offer/998877665.html',
            ],
          },
          error: 'AI evaluator rejected the 1688 supplier candidate (41%).',
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: 'AI evaluator rejected the 1688 supplier candidate (41%).',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-12T06:40:10.000Z',
          createdAt: '2026-04-12T06:39:00.000Z',
          updatedAt: '2026-04-12T06:40:10.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('AI Rejected')).toBeInTheDocument();
    expect(screen.getByText('Supplier result')).toBeInTheDocument();
    expect(screen.getByText('Supplier probe')).toBeInTheDocument();
    expect(screen.getAllByText('Apply blocked by AI rejection').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Verify Candidate URLs' })).toHaveAttribute(
      'href',
      'product-scan-1688-scan-1688-rejected-1-candidate-urls'
    );
    expect(screen.getByRole('link', { name: 'Verify Match Evaluation' })).toHaveAttribute(
      'href',
      'product-scan-1688-scan-1688-rejected-1-match-evaluation'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
    expect(screen.getByText(/Review bypass active/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo review' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo review' }));
    expect(screen.getAllByText('Apply blocked by AI rejection').length).toBeGreaterThan(0);
  });

  it('shows the recommended 1688 supplier summary when multiple meaningful supplier results exist', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-1688-approved-best',
          productId: 'product-1',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'completed',
          productName: 'Supplier Product 1',
          engineRunId: 'run-1688-approved-best',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: 'Best approved supplier listing',
          price: '¥10.20',
          url: 'https://detail.1688.com/offer/777777777.html',
          description: null,
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: null,
          supplierDetails: {
            supplierName: 'Approved Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/approved-store.html',
            supplierProductUrl: 'https://detail.1688.com/offer/777777777.html',
            platformProductId: '777777777',
            currency: 'CNY',
            priceText: '¥10.20',
            priceRangeText: null,
            moqText: 'MOQ 10 pcs',
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
          supplierProbe: null,
          supplierEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            titleMatch: true,
            confidence: 0.92,
            proceed: true,
            reasons: ['Approved supplier match.'],
            mismatches: [],
            modelId: 'gpt-5.4-mini',
            error: null,
            evaluatedAt: '2026-04-12T07:10:00.000Z',
          },
          steps: [],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-12T07:10:00.000Z',
          createdAt: '2026-04-12T07:09:00.000Z',
          updatedAt: '2026-04-12T07:10:00.000Z',
        },
        {
          id: 'scan-1688-heuristic-weaker',
          productId: 'product-1',
          provider: '1688',
          scanType: 'supplier_reverse_image',
          status: 'completed',
          productName: 'Supplier Product 1',
          engineRunId: 'run-1688-heuristic-weaker',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: 'Heuristic supplier listing',
          price: '¥11.60-12.10',
          url: 'https://detail.1688.com/offer/555555555.html',
          description: null,
          amazonDetails: null,
          amazonProbe: null,
          amazonEvaluation: null,
          supplierDetails: {
            supplierName: 'Heuristic Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/heuristic-store.html',
            supplierProductUrl: 'https://detail.1688.com/offer/555555555.html',
            platformProductId: '555555555',
            currency: 'CNY',
            priceText: '¥11.60-12.10',
            priceRangeText: '¥11.60-12.10',
            moqText: 'MOQ 15 pcs',
            supplierLocation: 'Zhejiang, China',
            supplierRating: 'Gold supplier',
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/555555555.html',
            canonicalUrl: 'https://detail.1688.com/offer/555555555.html',
            pageTitle: 'Heuristic supplier listing',
            descriptionSnippet: null,
            pageLanguage: 'zh-CN',
            supplierName: 'Heuristic Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/heuristic-store.html',
            priceText: '¥11.60-12.10',
            currency: 'CNY',
            heroImageUrl: null,
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: '1688-scan-probe-image-2',
            imageCount: 2,
          },
          supplierEvaluation: null,
          steps: [],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'not_needed',
          asinUpdateMessage: null,
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-12T07:05:00.000Z',
          createdAt: '2026-04-12T07:04:00.000Z',
          updatedAt: '2026-04-12T07:05:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Recommended 1688 Supplier')).toBeInTheDocument();
    expect(screen.getByText('Top pick')).toBeInTheDocument();
    expect(
      screen.getByText('Supplier result with best match criteria and pricing.')
    ).toBeInTheDocument();
    expect(screen.getByText(/\(compared to .*1 alternative result\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('Best approved supplier listing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI-approved supplier match').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Heuristic supplier match').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Heuristic Supplier Co.').length).toBeGreaterThan(0);
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
          amazonDetails: {
            brand: 'Acme',
            manufacturer: 'Acme Manufacturing',
            modelNumber: 'MODEL-1',
            partNumber: 'PART-1',
            color: 'Blue',
            style: 'Modern',
            material: 'Steel',
            size: 'Large',
            pattern: null,
            finish: 'Matte',
            itemDimensions: '12 x 8 x 4 inches',
            packageDimensions: '14 x 10 x 5 inches',
            itemWeight: '1.2 pounds',
            packageWeight: '1.5 pounds',
            bestSellersRank: '#42 in Home & Kitchen',
            ean: '5901234567890',
            gtin: '5901234567890',
            upc: null,
            isbn: null,
            bulletPoints: ['Steel frame', 'Blue finish'],
            attributes: [
              {
                key: 'manufacturer',
                label: 'Manufacturer',
                value: 'Acme Manufacturing',
                source: 'technical_details',
              },
              {
                key: 'product dimensions',
                label: 'Product Dimensions',
                value: '12 x 8 x 4 inches',
                source: 'technical_details',
              },
            ],
            rankings: [
              {
                rank: '#42',
                category: 'Home & Kitchen',
                source: 'best_sellers_rank',
              },
            ],
          },
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

  it('shows and hides scan diagnostics for a failed scan entry', async () => {
    mocks.apiGetMock.mockResolvedValue({
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
              key: 'google_candidates',
              label: 'Collect Amazon candidates from Google results',
              group: 'google_lens',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: null,
              inputSource: 'url',
              retryOf: null,
              resultCode: 'candidate_collect_timeout',
              status: 'failed',
              message: 'Timed out while waiting for reverse image results.',
              warning: null,
              details: [],
              url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
              startedAt: '2026-04-11T04:00:00.000Z',
              completedAt: '2026-04-11T04:00:08.000Z',
              durationMs: 8000,
            },
          ],
          rawResult: {
            runId: 'run-diagnostics-1',
            runStatus: 'failed',
            latestStage: 'google_candidates',
            latestStageUrl: 'https://lens.google.com/search',
            failureArtifacts: [
              {
                name: 'Final Screenshot',
                path: '/tmp/google-lens-final.png',
                kind: 'screenshot',
                mimeType: 'image/png',
              },
            ],
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Failure source')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Collect Amazon candidates from Google results')).toBeInTheDocument();
    expect(screen.getByText('Candidate Collect Timeout')).toBeInTheDocument();
    expect(screen.getByText('Timed out while waiting for reverse image results.')).toBeInTheDocument();
    expect(screen.getByText(/Duration 8\.0 s/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Show diagnostics' }));

    expect(await screen.findByText('Run run-diagnostics-1')).toBeInTheDocument();
    expect(screen.getByText('Stage: Google Candidates')).toBeInTheDocument();
    expect(screen.getByText('Final Screenshot')).toBeInTheDocument();
    expect(screen.getByText('/tmp/google-lens-final.png')).toBeInTheDocument();
    expect(screen.getByText(/candidate collection failed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide diagnostics' }));

    await waitFor(() => {
      expect(screen.queryByText('Run run-diagnostics-1')).not.toBeInTheDocument();
    });
  });

  it('falls back to raw diagnostics for the collapsed failure summary when no failed step is persisted', async () => {
    mocks.apiGetMock.mockResolvedValue({
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Amazon scan failed.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show diagnostics' }));

    expect(await screen.findByText('Run run-diagnostics-fallback-1')).toBeInTheDocument();
    expect(screen.getByText('Stage: Google Candidates')).toBeInTheDocument();
    expect(screen.getByText(/candidate collection failed/)).toBeInTheDocument();
  });

  it('shows and hides extracted Amazon fields for a scan entry', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-details-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-details-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          amazonDetails: {
            brand: 'Acme',
            manufacturer: 'Acme Manufacturing',
            modelNumber: 'MODEL-1',
            partNumber: 'PART-1',
            color: 'Blue',
            style: 'Modern',
            material: 'Steel',
            size: 'Large',
            pattern: null,
            finish: 'Matte',
            itemDimensions: '12 x 8 x 4 inches',
            packageDimensions: '14 x 10 x 5 inches',
            itemWeight: '1.2 pounds',
            packageWeight: '1.5 pounds',
            bestSellersRank: '#42 in Home & Kitchen',
            ean: '5901234567890',
            gtin: '5901234567890',
            upc: null,
            isbn: null,
            bulletPoints: ['Steel frame', 'Blue finish'],
            attributes: [
              {
                key: 'manufacturer',
                label: 'Manufacturer',
                value: 'Acme Manufacturing',
                source: 'technical_details',
              },
            ],
            rankings: [
              {
                rank: '#42',
                category: 'Home & Kitchen',
                source: 'best_sellers_rank',
              },
            ],
          },
          steps: [
            {
              key: 'google_upload',
              label: 'Upload image to Google Lens',
              status: 'completed',
              message: 'Uploaded image image-1 by URL.',
              candidateId: 'image-1',
              inputSource: 'url',
              retryOf: 'File input',
              resultCode: 'upload_succeeded',
              startedAt: '2026-04-11T04:00:00.000Z',
              completedAt: '2026-04-11T04:00:02.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Matched Amazon product data.',
              candidateId: 'image-1',
              candidateRank: 1,
              resultCode: 'match_found',
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    await waitFor(() => {
      expect(screen.getAllByText('Scan Provenance').length).toBeGreaterThan(1);
    });
    expect(screen.getAllByText('Strong match').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Google: URL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fallback: File input').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Amazon rank: #1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Image: image-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Result: Match Found').length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Identifiers')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('5901234567890').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Manufacturing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 x 8 x 4 inches').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#42 in Home & Kitchen').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Steel frame').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All Extracted Amazon Attributes').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Hide extracted fields' }));

    await waitFor(() => {
      expect(screen.queryAllByText('All Extracted Amazon Attributes')).toHaveLength(0);
    });
  });

  it('shows a collapsed rejected-candidate summary for completed scans', async () => {
    mocks.apiGetMock.mockResolvedValue({
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(
      await screen.findByText(/AI recommendation: Strong match after 2 rejected candidates/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('2 candidates rejected before match').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('Latest reason: The second Amazon page is still a different product.').length
    ).toBeGreaterThan(0);
  });

  it('shows AI language rejection history in collapsed scan rows', async () => {
    mocks.apiGetMock.mockResolvedValue({
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('AI policy')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by AI')).toBeInTheDocument();
    expect(screen.getByText('1 candidate rejected before match')).toBeInTheDocument();
    expect(screen.getByText('(1 non-English)')).toBeInTheDocument();
    expect(screen.getByText('Latest reason: Detected German product content.')).toBeInTheDocument();
    expect(
      screen.getByText('AI evaluator rejected the Amazon candidate because page content is not English.')
    ).toBeInTheDocument();
  });

  it('shows recommendation reasoning in collapsed scan rows', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-newer-strong-rejected',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-newer-strong-rejected',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000NEWER',
          title: 'Newer strong title',
          price: '$19.99',
          url: 'https://www.amazon.com/dp/B000NEWER',
          description: 'Newer strong description',
          amazonDetails: {
            brand: null,
            manufacturer: 'Newer Manufacturing',
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
            ean: '5900000000011',
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
              status: 'failed',
              message: 'AI evaluator rejected candidate #1.',
              candidateId: 'image-1',
              candidateRank: 1,
              resultCode: 'candidate_rejected',
              details: [
                { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00WRONG111' },
                { label: 'Reason', value: 'Wrong product.' },
              ],
              startedAt: '2026-04-11T06:00:01.000Z',
              completedAt: '2026-04-11T06:00:02.000Z',
            },
            {
              key: 'amazon_ai_evaluate',
              label: 'Evaluate Amazon candidate match',
              status: 'failed',
              message: 'AI evaluator rejected candidate #2 because page content is not English.',
              candidateId: 'image-1',
              candidateRank: 2,
              resultCode: 'candidate_language_rejected',
              details: [
                { label: 'Model source', value: 'AI Brain default' },
                { label: 'Model', value: 'gpt-4o' },
                { label: 'Threshold', value: '85%' },
                { label: 'Evaluation scope', value: 'Every Amazon candidate' },
                { label: 'Allowed content language', value: 'English' },
                { label: 'Language policy', value: 'Reject non-English content' },
                { label: 'Language detection', value: 'Deterministic first, then AI' },
                { label: 'Candidate URL', value: 'https://www.amazon.com/dp/B00WRONG222' },
                { label: 'Language reason', value: 'Detected German product content.' },
              ],
              startedAt: '2026-04-11T06:00:03.000Z',
              completedAt: '2026-04-11T06:00:04.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Matched Amazon product data.',
              candidateId: 'image-1',
              candidateRank: 3,
              resultCode: 'match_found',
              startedAt: '2026-04-11T06:00:05.000Z',
              completedAt: '2026-04-11T06:00:08.000Z',
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T06:00:09.000Z',
          createdAt: '2026-04-11T06:00:00.000Z',
          updatedAt: '2026-04-11T06:00:09.000Z',
        },
        {
          id: 'scan-older-strong-clean',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-older-strong-clean',
          imageCandidates: [],
          matchedImageId: 'image-2',
          asin: 'B000OLDER',
          title: 'Older strong title',
          price: '$12.99',
          url: 'https://www.amazon.com/dp/B000OLDER',
          description: 'Older strong description',
          amazonDetails: {
            brand: null,
            manufacturer: 'Older Manufacturing',
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
            ean: '5900000000012',
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            attributes: [],
            rankings: [],
          },
          steps: [
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Matched Amazon product data.',
              candidateId: 'image-2',
              candidateRank: 1,
              resultCode: 'match_found',
              startedAt: '2026-04-10T06:00:05.000Z',
              completedAt: '2026-04-10T06:00:08.000Z',
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-10T06:00:09.000Z',
          createdAt: '2026-04-10T06:00:00.000Z',
          updatedAt: '2026-04-10T06:00:09.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Recommended Amazon Result')).toBeInTheDocument();
    expect(screen.getByText('Older strong title')).toBeInTheDocument();
    expect(
      screen.getByText('AI recommendation: Strongest clean match')
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/2 rejected candidate/).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 non-English/).length).toBeGreaterThan(0);
  });

  it('applies extracted identifiers, weight, and dimensions into the product form', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-apply-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-apply-1',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          amazonDetails: {
            brand: 'Acme',
            manufacturer: 'Acme Manufacturing',
            modelNumber: 'MODEL-1',
            partNumber: 'PART-1',
            color: 'Blue',
            style: 'Modern',
            material: 'Steel',
            size: 'Large',
            pattern: null,
            finish: 'Matte',
            itemDimensions: '12 x 8 x 4 inches',
            packageDimensions: null,
            itemWeight: '1.2 pounds',
            packageWeight: null,
            bestSellersRank: '#42 in Home & Kitchen',
            ean: '5901234567890',
            gtin: '5901234567890',
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Use ASIN' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use EAN' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use GTIN' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use Weight' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Use Dimensions' })[0]);

    expect(mocks.setValueMock).toHaveBeenCalledWith('asin', 'B000123456', expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('ean', '5901234567890', expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('gtin', '5901234567890', expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('weight', 0.54, expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('sizeLength', 30.5, expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('sizeWidth', 20.3, expect.any(Object));
    expect(mocks.setValueMock).toHaveBeenCalledWith('length', 10.2, expect.any(Object));
  });

  it('applies matched Amazon attributes into parameters and text custom fields', async () => {
    mocks.useProductFormParametersMock.mockReturnValue({
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
    });
    mocks.useProductFormCustomFieldsMock.mockReturnValue({
      customFields: [
        {
          id: 'custom-color',
          name: 'Color',
          type: 'text',
          options: [],
        },
      ],
      customFieldsLoading: false,
      customFieldValues: [],
      setTextValue: mocks.setTextValueMock,
      toggleSelectedOption: mocks.toggleSelectedOptionMock,
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-map-1',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-map-1',
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
            color: 'Blue',
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
            ean: null,
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    expect((await screen.findAllByText('Matched product metadata targets')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manufacturer -> Parameter: Manufacturer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Color -> Custom field: Color').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Apply matched attributes' })[0]);

    expect(mocks.addParameterValueMock).toHaveBeenCalled();
    expect(mocks.updateParameterIdMock).toHaveBeenCalledWith(0, 'param-manufacturer');
    expect(mocks.updateParameterValueMock).toHaveBeenCalledWith(0, 'Acme Manufacturing');
    expect(mocks.setTextValueMock).toHaveBeenCalledWith('custom-color', 'Blue');
  });

  it('shows extracted Amazon attributes that do not match any product target', async () => {
    mocks.useProductFormParametersMock.mockReturnValue({
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
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-unmapped',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-unmapped',
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
            ean: null,
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            attributes: [
              {
                key: 'power_source',
                label: 'Power Source',
                value: 'Battery Powered',
                source: 'technical_details',
              },
            ],
            rankings: [],
          },
          steps: [],
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    expect((await screen.findAllByText('Matched product metadata targets')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manufacturer -> Parameter: Manufacturer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unmapped extracted attributes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1 unmapped').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Power Source').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Amazon: Battery Powered').length).toBeGreaterThan(0);
    expect(screen.getAllByText('No matching product target yet.').length).toBeGreaterThan(0);
  });

  it('applies a single matched Amazon attribute without touching other mappings', async () => {
    mocks.useProductFormParametersMock.mockReturnValue({
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
    });
    mocks.useProductFormCustomFieldsMock.mockReturnValue({
      customFields: [
        {
          id: 'custom-color',
          name: 'Color',
          type: 'text',
          options: [],
        },
      ],
      customFieldsLoading: false,
      customFieldValues: [],
      setTextValue: mocks.setTextValueMock,
      toggleSelectedOption: mocks.toggleSelectedOptionMock,
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-map-single',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-map-single',
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
            color: 'Blue',
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
            ean: null,
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Apply Manufacturer mapping' })[0]);

    expect(mocks.addParameterValueMock).toHaveBeenCalled();
    expect(mocks.updateParameterIdMock).toHaveBeenCalledWith(0, 'param-manufacturer');
    expect(mocks.updateParameterValueMock).toHaveBeenCalledWith(0, 'Acme Manufacturing');
    expect(mocks.setTextValueMock).not.toHaveBeenCalled();
  });

  it('applies matched Amazon attributes into checkbox-set custom fields', async () => {
    mocks.useProductFormCustomFieldsMock.mockReturnValue({
      customFields: [
        {
          id: 'custom-color-flags',
          name: 'Color',
          type: 'checkbox_set',
          options: [
            { id: 'blue-option', label: 'Blue' },
            { id: 'red-option', label: 'Red' },
            { id: 'green-option', label: 'Green' },
          ],
        },
      ],
      customFieldsLoading: false,
      customFieldValues: [{ fieldId: 'custom-color-flags', selectedOptionIds: ['green-option'] }],
      setTextValue: mocks.setTextValueMock,
      toggleSelectedOption: mocks.toggleSelectedOptionMock,
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-map-2',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-map-2',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: 'B000123456',
          title: 'Amazon title',
          price: '$10.99',
          url: 'https://www.amazon.com/dp/B000123456',
          description: 'Amazon description',
          amazonDetails: {
            brand: null,
            manufacturer: null,
            modelNumber: null,
            partNumber: null,
            color: 'Blue, Red',
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
            ean: null,
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

    fireEvent.click(await screen.findByRole('button', { name: 'Show extracted fields' }));

    expect((await screen.findAllByText('Matched product metadata targets')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Color -> Custom field: Color [Blue, Red]').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Current: Green').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Amazon: Blue, Red').length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Apply matched attributes' })[0]);

    expect(mocks.toggleSelectedOptionMock).toHaveBeenCalledWith(
      'custom-color-flags',
      'blue-option',
      true
    );
    expect(mocks.toggleSelectedOptionMock).toHaveBeenCalledWith(
      'custom-color-flags',
      'red-option',
      true
    );
    expect(mocks.toggleSelectedOptionMock).toHaveBeenCalledWith(
      'custom-color-flags',
      'green-option',
      false
    );
    expect(mocks.setTextValueMock).not.toHaveBeenCalled();
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
      expect(mocks.apiGetMock).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText('Amazon title')).toBeInTheDocument();
    expect(screen.getAllByText('Product ASIN filled from Amazon scan.').length).toBeGreaterThan(0);
  });

  it('allows deleting a scan from history', async () => {
    const scanId = 'scan-to-delete-1';
    mocks.useProductFormCoreMock.mockReturnValue({
      product: { id: 'product-1' },
      getValues: mocks.getValuesMock,
      setValue: mocks.setValueMock,
    });
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: scanId,
          productId: 'product-1',
          provider: 'amazon',
          status: 'completed',
          title: 'Scan to Delete',
          createdAt: '2026-04-12T10:00:00.000Z',
        },
      ],
    });
    mocks.apiDeleteMock.mockResolvedValue({ success: true });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormScans />
      </QueryClientProvider>
    );

    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mocks.apiDeleteMock).toHaveBeenCalledWith(`/api/v2/products/scans/${scanId}`);
    });

    // Verification of cache invalidation is implicit via useQuery refetching if we had a full setup,
    // but here we just check if api.delete was called.
  });
});
