import { beforeEach, describe, expect, it, vi } from 'vitest';

import { externalServiceError } from '@/shared/errors/app-error';

const callBaseApiMock = vi.hoisted(() => vi.fn());
const extractProductIdsMock = vi.hoisted(() => vi.fn());
const extractProductsMock = vi.hoisted(() => vi.fn());
const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('./core', () => ({
  callBaseApi: (...args: unknown[]) => callBaseApiMock(...args),
}));

vi.mock('../base-client-parsers', () => ({
  extractProductIds: (...args: unknown[]) => extractProductIdsMock(...args),
  extractProducts: (...args: unknown[]) => extractProductsMock(...args),
  toStringId: vi.fn((value: unknown) => (typeof value === 'string' ? value : null)),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import { fetchBaseProductDetails, fetchBaseProductIds } from './products';

describe('base-client products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBaseProductIds', () => {
    it('keeps the first real upstream error instead of masking it with ERROR_UNKNOWN_METHOD', async () => {
      callBaseApiMock
        .mockRejectedValueOnce(
          externalServiceError('The account related to provided token is blocked', {
            method: 'getInventoryProductsList',
            errorCode: 'ERROR_USER_ACCOUNT_BLOCKED',
          })
        )
        .mockRejectedValueOnce(
          externalServiceError('An unknown method has been used', {
            method: 'getProductsList',
            errorCode: 'ERROR_UNKNOWN_METHOD',
          })
        );

      await expect(fetchBaseProductIds('token', 'inventory-1')).rejects.toMatchObject({
        message: 'The account related to provided token is blocked',
      });
    });

    it('falls back to the secondary method when the first one is unsupported', async () => {
      callBaseApiMock
        .mockRejectedValueOnce(
          externalServiceError('An unknown method has been used', {
            method: 'getInventoryProductsList',
            errorCode: 'ERROR_UNKNOWN_METHOD',
          })
        )
        .mockResolvedValueOnce({ products: ['2001'] });
      extractProductIdsMock.mockReturnValueOnce(['2001']);

      await expect(fetchBaseProductIds('token', 'inventory-1')).resolves.toEqual(['2001']);
    });
  });

  describe('fetchBaseProductDetails', () => {
    it('keeps the first real upstream error for batch detail fetches', async () => {
      callBaseApiMock
        .mockRejectedValueOnce(
          externalServiceError('The account related to provided token is blocked', {
            method: 'getInventoryProductsData',
            errorCode: 'ERROR_USER_ACCOUNT_BLOCKED',
          })
        )
        .mockRejectedValueOnce(
          externalServiceError('An unknown method has been used', {
            method: 'getProductsData',
            errorCode: 'ERROR_UNKNOWN_METHOD',
          })
        );

      await expect(fetchBaseProductDetails('token', 'inventory-1', ['2001'])).rejects.toMatchObject({
        message: 'The account related to provided token is blocked',
      });
    });

    it('falls back to the secondary details method when the first one is unsupported', async () => {
      const product = { id: '2001', sku: 'SKU-2001' };
      callBaseApiMock
        .mockRejectedValueOnce(
          externalServiceError('An unknown method has been used', {
            method: 'getInventoryProductsData',
            errorCode: 'ERROR_UNKNOWN_METHOD',
          })
        )
        .mockResolvedValueOnce({ products: [product] });
      extractProductsMock.mockReturnValueOnce([product]);

      await expect(fetchBaseProductDetails('token', 'inventory-1', ['2001'])).resolves.toEqual([
        product,
      ]);
    });
  });
});
