/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';

const mocks = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
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
    get: (...args: unknown[]) => mocks.apiGetMock(...args),
  },
}));

import ProductFormLatestAmazonExtraction from './ProductFormLatestAmazonExtraction';

const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('ProductFormLatestAmazonExtraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getValuesMock.mockImplementation((field?: string) => {
      const values: Record<string, unknown> = {
        ean: '',
        gtin: '',
        asin: '',
        weight: 0,
        sizeLength: 0,
        sizeWidth: 0,
        length: 0,
      };
      return field ? values[field] : values;
    });
  });

  it('renders the latest extracted Amazon scan and applies values into the product form', async () => {
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
              key: 'google_upload',
              label: 'Upload image to Google Lens',
              status: 'completed',
              message: 'Uploaded image image-1 by URL.',
              candidateId: 'image-1',
              inputSource: 'url',
              retryOf: 'File input',
              resultCode: 'upload_succeeded',
              startedAt: '2026-04-11T03:59:10.000Z',
              completedAt: '2026-04-11T03:59:12.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Matched Amazon product data.',
              candidateId: 'image-1',
              candidateRank: 1,
              resultCode: 'match_found',
              startedAt: '2026-04-11T03:59:13.000Z',
              completedAt: '2026-04-11T03:59:16.000Z',
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

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormCoreStateContext.Provider
          value={
            {
              product: { id: 'product-1' },
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
                <ProductFormLatestAmazonExtraction />
              </ProductFormCustomFieldContext.Provider>
            </ProductFormParameterContext.Provider>
          </ProductFormCoreActionsContext.Provider>
        </ProductFormCoreStateContext.Provider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Latest Amazon Extraction')).toBeInTheDocument();
    expect(screen.getAllByText('Strong match').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Fallback used').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Scan Provenance').length).toBeGreaterThan(1);
    expect(screen.getByText('Google: URL')).toBeInTheDocument();
    expect(screen.getByText('Fallback: File input')).toBeInTheDocument();
    expect(screen.getByText('Amazon rank: #1')).toBeInTheDocument();
    expect(screen.getByText('Image: image-1')).toBeInTheDocument();
    expect(screen.getByText('Result: Match Found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use EAN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Manufacturer mapping' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use EAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Manufacturer mapping' }));

    expect(mocks.setValueMock).toHaveBeenCalledWith('ean', '5901234567890', expect.any(Object));
    expect(mocks.addParameterValueMock).toHaveBeenCalled();
    expect(mocks.updateParameterIdMock).toHaveBeenCalledWith(0, 'param-manufacturer');
    expect(mocks.updateParameterValueMock).toHaveBeenCalledWith(0, 'Acme Manufacturing');

    await waitFor(() => {
      expect(mocks.apiGetMock).toHaveBeenCalledWith('/api/v2/products/product-1/scans', {
        cache: 'no-store',
        params: { limit: 10 },
      });
    });
  });

  it('ranks stronger Amazon scans ahead of newer partial runs and still lets the user switch', async () => {
    mocks.apiGetMock.mockResolvedValue({
      scans: [
        {
          id: 'scan-newer-partial',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-newer-partial',
          imageCandidates: [],
          matchedImageId: 'image-1',
          asin: null,
          title: 'Newer partial title',
          price: '$19.99',
          url: 'https://www.amazon.com/dp/B000PARTIAL',
          description: 'Newer partial description',
          amazonDetails: {
            brand: null,
            manufacturer: 'Newer Partial Manufacturing',
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
            ean: '5900000000001',
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            attributes: [],
            rankings: [],
          },
          steps: [
            {
              key: 'google_captcha',
              label: 'Google captcha',
              status: 'completed',
              message: 'Google Lens captcha resolved.',
              resultCode: 'captcha_resolved',
              startedAt: '2026-04-11T05:09:05.000Z',
              completedAt: '2026-04-11T05:09:08.000Z',
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              status: 'completed',
              message: 'Extracted Amazon details without ASIN.',
              candidateId: 'image-1',
              candidateRank: 2,
              resultCode: 'asin_missing',
              startedAt: '2026-04-11T05:09:10.000Z',
              completedAt: '2026-04-11T05:09:15.000Z',
            },
          ],
          rawResult: null,
          error: null,
          asinUpdateStatus: 'updated',
          asinUpdateMessage: 'Product ASIN filled from Amazon scan.',
          createdBy: null,
          updatedBy: null,
          completedAt: '2026-04-11T05:10:00.000Z',
          createdAt: '2026-04-11T05:09:00.000Z',
          updatedAt: '2026-04-11T05:10:00.000Z',
        },
        {
          id: 'scan-older-strong',
          productId: 'product-1',
          provider: 'amazon',
          scanType: 'google_reverse_image',
          status: 'completed',
          productName: 'Product 1',
          engineRunId: 'run-older-strong',
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
            ean: '5900000000002',
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
          completedAt: '2026-04-10T05:10:00.000Z',
          createdAt: '2026-04-10T05:09:00.000Z',
          updatedAt: '2026-04-10T05:10:00.000Z',
        },
      ],
    });

    render(
      <QueryClientProvider client={createQueryClient()}>
        <ProductFormCoreStateContext.Provider
          value={
            {
              product: { id: 'product-1' },
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
                <ProductFormLatestAmazonExtraction />
              </ProductFormCustomFieldContext.Provider>
            </ProductFormParameterContext.Provider>
          </ProductFormCoreActionsContext.Provider>
        </ProductFormCoreStateContext.Provider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Recent extracted scans')).toBeInTheDocument();
    const firstButton = screen.getByRole('button', { name: 'Show Amazon extraction 1' });
    const secondButton = screen.getByRole('button', { name: 'Show Amazon extraction 2' });
    expect(firstButton).toBeInTheDocument();
    expect(secondButton).toBeInTheDocument();
    expect(screen.getAllByText('Strong match').length).toBeGreaterThan(1);
    expect(firstButton).toHaveTextContent('Recommended');
    expect(firstButton).toHaveTextContent('ASIN B000OLDER');
    expect(firstButton).toHaveTextContent('Strong match');
    expect(secondButton).toHaveTextContent('No ASIN');
    expect(secondButton).toHaveTextContent('Partial extraction');
    expect(secondButton).toHaveTextContent('Captcha path');
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(1);
    expect(screen.getByText('5900000000002')).toBeInTheDocument();

    fireEvent.click(secondButton);

    expect(screen.getByText('5900000000001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use EAN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Manufacturer mapping' }));

    expect(mocks.setValueMock).toHaveBeenCalledWith('ean', '5900000000001', expect.any(Object));
    expect(mocks.updateParameterValueMock).toHaveBeenCalledWith(0, 'Newer Partial Manufacturing');
  });
});
