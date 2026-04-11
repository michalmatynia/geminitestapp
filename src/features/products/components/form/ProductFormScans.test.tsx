/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useProductFormParametersMock: vi.fn(),
  useProductFormCustomFieldsMock: vi.fn(),
  apiGetMock: vi.fn(),
  invalidateProductsCountsAndDetailMock: vi.fn().mockResolvedValue(undefined),
  productAmazonScanModalMock: vi.fn(),
  setValueMock: vi.fn(),
  getValuesMock: vi.fn(),
  addParameterValueMock: vi.fn(),
  updateParameterIdMock: vi.fn(),
  updateParameterValueMock: vi.fn(),
  setTextValueMock: vi.fn(),
  toggleSelectedOptionMock: vi.fn(),
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

    expect(await screen.findByText('Amazon reverse image scan running.')).toBeInTheDocument();
    expect(screen.getByText('Current step')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Collect Amazon candidates from Google results')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('URL input')).toBeInTheDocument();
    expect(screen.getByText('Waiting for reverse image results.')).toBeInTheDocument();
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

    expect(await screen.findByText('Last failure')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Collect Amazon candidates from Google results')).toBeInTheDocument();
    expect(screen.getByText('Candidate collection')).toBeInTheDocument();
    expect(screen.getByText('Candidate Collect Timeout')).toBeInTheDocument();
    expect(screen.getByText('Timed out while waiting for reverse image results.')).toBeInTheDocument();
    expect(screen.getByText(/Duration 8\.0 s/)).toBeInTheDocument();
    expect(screen.getByText('1 artifact')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy artifact path' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open latest artifact' })).toHaveAttribute(
      'href',
      '/api/v2/products/scans/scan-diagnostics-1/artifacts/google-lens-final.png'
    );
    expect(screen.getByRole('link', { name: 'Open stage URL' })).toHaveAttribute(
      'href',
      'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg'
    );

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
    expect(screen.getByText('Google: URL')).toBeInTheDocument();
    expect(screen.getByText('Fallback: File input')).toBeInTheDocument();
    expect(screen.getByText('Amazon rank: #1')).toBeInTheDocument();
    expect(screen.getByText('Image: image-1')).toBeInTheDocument();
    expect(screen.getByText('Result: Match Found')).toBeInTheDocument();
    expect(await screen.findByText('Identifiers')).toBeInTheDocument();
    expect(screen.getAllByText('5901234567890').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Acme Manufacturing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 x 8 x 4 inches').length).toBeGreaterThan(0);
    expect(screen.getAllByText('#42 in Home & Kitchen').length).toBeGreaterThan(0);
    expect(screen.getByText('Steel frame')).toBeInTheDocument();
    expect(screen.getByText('All Extracted Amazon Attributes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide extracted fields' }));

    await waitFor(() => {
      expect(screen.queryByText('All Extracted Amazon Attributes')).not.toBeInTheDocument();
    });
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

    fireEvent.click(screen.getByRole('button', { name: 'Use ASIN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use EAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use GTIN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Weight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Dimensions' }));

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

    expect(await screen.findByText('Matched product metadata targets')).toBeInTheDocument();
    expect(screen.getByText('Manufacturer -> Parameter: Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Color -> Custom field: Color')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply matched attributes' }));

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

    expect(await screen.findByText('Matched product metadata targets')).toBeInTheDocument();
    expect(screen.getByText('Manufacturer -> Parameter: Manufacturer')).toBeInTheDocument();
    expect(screen.getByText('Unmapped extracted attributes')).toBeInTheDocument();
    expect(screen.getByText('1 unmapped')).toBeInTheDocument();
    expect(screen.getAllByText('Power Source')).toHaveLength(2);
    expect(screen.getByText('Amazon: Battery Powered')).toBeInTheDocument();
    expect(screen.getByText('No matching product target yet.')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Apply Manufacturer mapping' }));

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

    expect(await screen.findByText('Matched product metadata targets')).toBeInTheDocument();
    expect(screen.getByText('Color -> Custom field: Color [Blue, Red]')).toBeInTheDocument();
    expect(screen.getByText('Current: Green')).toBeInTheDocument();
    expect(screen.getByText('Amazon: Blue, Red')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply matched attributes' }));

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
