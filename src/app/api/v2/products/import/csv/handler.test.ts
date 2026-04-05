import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { bulkCreateProductsMock, captureExceptionMock, logWarningMock } = vi.hoisted(() => ({
  bulkCreateProductsMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  productService: {
    bulkCreateProducts: (...args: unknown[]) => bulkCreateProductsMock(...args),
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
    logWarning: (...args: unknown[]) => logWarningMock(...args),
  },
}));

import { csvImportPayloadSchema, postProductsImportCsvHandler } from './handler';

const createCsvRequest = (csv: string | null): NextRequest => {
  const formData = new FormData();
  if (csv !== null) {
    formData.set('file', new File([csv], 'products.csv', { type: 'text/csv' }));
  }

  return {
    formData: async () => formData,
  } as NextRequest;
};

describe('product import csv handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bulkCreateProductsMock.mockResolvedValue(2);
    captureExceptionMock.mockResolvedValue(undefined);
    logWarningMock.mockResolvedValue(undefined);
  });

  it('exports the csv payload schema', () => {
    expect(typeof postProductsImportCsvHandler).toBe('function');
    expect(typeof csvImportPayloadSchema.safeParse).toBe('function');
  });

  it('imports csv rows in batches and skips rows without sku', async () => {
    const response = await postProductsImportCsvHandler(
      createCsvRequest(
        [
          'SKU,Name PL,Name EN,Name DE,Cena sprzedaży Retail Online (in EUR),EN,DE,PL',
          'sku-1,Nazwa 1,Name 1,Name 1 DE,12,Desc EN 1,Desc DE 1,Desc PL 1',
          ',Skipped,Skipped,Skipped,15,Skip EN,Skip DE,Skip PL',
          'sku-2,Nazwa 2,Name 2,Name 2 DE,,Desc EN 2,Desc DE 2,Desc PL 2',
        ].join('\n')
      ),
      {} as ApiHandlerContext
    );

    expect(bulkCreateProductsMock).toHaveBeenCalledTimes(1);
    expect(bulkCreateProductsMock).toHaveBeenCalledWith([
      {
        sku: 'sku-1',
        name_pl: 'Nazwa 1',
        name_en: 'Name 1',
        name_de: 'Name 1 DE',
        price: 12,
        description_en: 'Desc EN 1',
        description_de: 'Desc DE 1',
        description_pl: 'Desc PL 1',
      },
      {
        sku: 'sku-2',
        name_pl: 'Nazwa 2',
        name_en: 'Name 2',
        name_de: 'Name 2 DE',
        price: 0,
        description_en: 'Desc EN 2',
        description_de: 'Desc DE 2',
        description_pl: 'Desc PL 2',
      },
    ]);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'CSV import completed',
      summary: {
        total: 3,
        successful: 2,
        failed: 0,
        errors: [],
      },
    });
  });

  it('rejects requests without a csv file', async () => {
    await expect(
      postProductsImportCsvHandler(createCsvRequest(null), {} as ApiHandlerContext)
    ).rejects.toMatchObject({
      message: 'No file uploaded',
      httpStatus: 400,
    });

    expect(bulkCreateProductsMock).not.toHaveBeenCalled();
  });

  it('marks the batch as failed when bulk create throws', async () => {
    bulkCreateProductsMock.mockRejectedValue(new Error('database unavailable'));

    const response = await postProductsImportCsvHandler(
      createCsvRequest(
        [
          'SKU,Name PL,Name EN,Name DE,Cena sprzedaży Retail Online (in EUR),EN,DE,PL',
          'sku-1,Nazwa 1,Name 1,Name 1 DE,12,Desc EN 1,Desc DE 1,Desc PL 1',
          'sku-2,Nazwa 2,Name 2,Name 2 DE,13,Desc EN 2,Desc DE 2,Desc PL 2',
        ].join('\n')
      ),
      {} as ApiHandlerContext
    );

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(logWarningMock).toHaveBeenCalledWith(
      'Failed to import batch of 2 products',
      expect.objectContaining({
        service: 'csv-import-v2',
        error: 'database unavailable',
      })
    );
    await expect(response.json()).resolves.toEqual({
      message: 'CSV import completed',
      summary: {
        total: 2,
        successful: 0,
        failed: 2,
        errors: [],
      },
    });
  });
});
