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

import { checkBaseSkuExists, fetchBaseProductDetails, fetchBaseProductIds } from './products';

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

    it('paginates product ids when the inventory spans multiple upstream pages', async () => {
      const firstPageIds = Array.from({ length: 1000 }, (_unused, index) => String(index + 1));
      const secondPageIds = Array.from({ length: 250 }, (_unused, index) =>
        String(index + 1001)
      );

      callBaseApiMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      extractProductIdsMock.mockReturnValueOnce(firstPageIds).mockReturnValueOnce(secondPageIds);

      await expect(fetchBaseProductIds('token', 'inventory-1')).resolves.toEqual([
        ...firstPageIds,
        ...secondPageIds,
      ]);
      expect(callBaseApiMock).toHaveBeenNthCalledWith(1, 'token', 'getInventoryProductsList', {
        inventory_id: 'inventory-1',
        include_variants: true,
      });
      expect(callBaseApiMock).toHaveBeenNthCalledWith(2, 'token', 'getInventoryProductsList', {
        inventory_id: 'inventory-1',
        include_variants: true,
        page: 2,
      });
    });

    it('stops paging once the requested product-id limit is satisfied', async () => {
      const firstPageIds = Array.from({ length: 1000 }, (_unused, index) => String(index + 1));

      callBaseApiMock.mockResolvedValueOnce({});
      extractProductIdsMock.mockReturnValueOnce(firstPageIds);

      await expect(fetchBaseProductIds('token', 'inventory-1', 3)).resolves.toEqual([
        '1',
        '2',
        '3',
      ]);
      expect(callBaseApiMock).toHaveBeenCalledTimes(1);
      expect(callBaseApiMock).toHaveBeenCalledWith('token', 'getInventoryProductsList', {
        inventory_id: 'inventory-1',
        include_variants: true,
      });
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

  describe('checkBaseSkuExists', () => {
    it('includes variants when resolving an exact SKU from inventory listings', async () => {
      callBaseApiMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      extractProductIdsMock.mockReturnValueOnce(['2002']);
      extractProductsMock.mockReturnValueOnce([
        {
          product_id: '2002',
          sku: 'MAYDICE003',
        },
      ]);

      await expect(checkBaseSkuExists('token', 'inventory-1', 'MAYDICE003')).resolves.toEqual({
        exists: true,
        productId: '2002',
      });
      expect(callBaseApiMock).toHaveBeenNthCalledWith(1, 'token', 'getInventoryProductsList', {
        inventory_id: 'inventory-1',
        filter_sku: 'MAYDICE003',
        include_variants: true,
      });
    });

    it('returns the nested variant id when the matching SKU is stored under variants', async () => {
      callBaseApiMock.mockResolvedValueOnce({}).mockResolvedValueOnce({});
      extractProductIdsMock.mockReturnValueOnce(['2001']);
      extractProductsMock.mockReturnValueOnce([
        {
          product_id: '2001',
          sku: 'PARENT-SKU',
          variants: {
            '3007': {
              sku: 'MAYDICE003',
            },
          },
        },
      ]);

      await expect(checkBaseSkuExists('token', 'inventory-1', 'MAYDICE003')).resolves.toEqual({
        exists: true,
        productId: '3007',
      });
    });
  });
});
